class Map {
  constructor () {
      this.lMap = null;
      this.lat = 0;
      this.long = 0;
      this.zoomLevel = 0;
      this.stateLayer = null;
      this.countyLayer = null;
      this.tileProvider = 'mapbox/streets-v11';
      this.stateIdsToLayer = {}
      this.countyIdsToLayer = {}
      this.overlayMaps = {}
      this.layerControl = null;
      this.legendControl = new LegendControl()
      this.info = null
  }

  initMap(accessToken) {
    this.lmap = L.map('map')
    this.addTileLayer(accessToken)
    this.setMapLatLong()
    this.setMapZoomLevel()
    this.setMapView()
    this.addInfoBlock()
    this.info.updateState = this.handleUpdateState()
    this.info.updateCounty = this.handleUpdateCounty()
    this.info.addTo(this.lmap);    
    this.createStateLayer();
    this.createCountyLayer();
    this.addStateLayerToMap()
    this.setStateIdsToLayer()
    this.setCountyIdsToLayer()
    this.setStateOutlines()
    this.setOverlayMaps();
    this.createLayerControl()
    this.layerControl.addTo(this.lmap)

  }

  setMapLatLong() {
    this.lat = 42;
    this.long =  -104;
  }

  setMapZoomLevel() {
    this.zoomLevel = 5
  }

  setMapView() {
    this.lmap.setView([this.lat, this.long], this.zoomLevel);
  }

  addTileLayer(accessToken) {
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: `<a href="https://github.com/rbracco/covidcompare" target="_blank">Github</a> |
      Covid Data: 
      <a href="https://covidtracking.com/api/" target="_blank">Testing</a> |
      <a href="https://covid19.mathdro.id/api/" target="_blank">State</a> |
      <a href="https://coronavirus.1point3acres.com/" target="_blank">County</a> 
      Map data: 
      <a href="https://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> |
      <a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank">CC-BY-SA</a> |
      <a href="https://www.mapbox.com/" target="_blank">Imagery:Mapbox</a>`,
    maxZoom: 18,
    id: this.tileProvider,
    tileSize: 512,
    zoomOffset: -1,
    accessToken: accessToken,
    }).addTo(this.lmap);
  }

  setStateOutlines() {
    let outlinePane = this.lmap.createPane('outlines');
    outlinePane.style.pointerEvents = 'none';
    outlinePane.style.zIndex = 600;

    L.geoJson(stateData, {
          color:"#444",
          fillOpacity:0,
          weight:2,
          pane: outlinePane,
          interactive:false,
      }).addTo(this.lmap)
  }

  createCountyLayer() {
    this.countyLayer = L.geoJson(countyData, 
      { 
          style: this.getCountyStyle, 
          onEachFeature: this.onEachCounty,
          highlightCounty: this.highlightCounty,
          resetHighlightCounty: this.resetHighlightCounty,          
      })
  }

  createStateLayer() {
    this.stateLayer = L.geoJson(stateData, 
      { 
          style: this.getStateStyle, 
          onEachFeature: this.onEachState, 
          highlightState: (layer) => {this.highlightState(layer)},
          resetHighlightState: (layer) => {this.resetHighlightState(layer)},
          zoomToCounties: (layer) => {this.zoomToCounties(layer)},
          stateLayer: this.stateLayer,
          countyLayer: this.countyLayer,
          lmap: this.lmap,  
          info: this.info,
      })
  }

  addStateLayerToMap() {
    this.stateLayer.addTo(this.lmap)
  }

  setStateIdsToLayer() {
    //Register a link between state IDs and the layer of their feature
    let _layersState = this.stateLayer["_layers"]
    for (let layer_key in _layersState){
        this.stateIdsToLayer[_layersState[layer_key]["feature"]["id"]] = layer_key
    }
  }

  setCountyIdsToLayer() {
    //Register a link between county geo_id and the layer of their feature
    let _layersCounty = this.countyLayer["_layers"]
    for (let layer_key in _layersCounty){
        this.countyIdsToLayer[_layersCounty[layer_key]["feature"]["properties"]["geo_id"]] = layer_key
    }        
  }

  setOverlayMaps() {
    this.overlayMaps["Counties"] = this.countyLayer;
    this.overlayMaps["State"] = this.stateLayer
  }

  createLayerControl() {
    this.layerControl = L.control.layers(this.overlayMaps)
  }

  expandLayerControl() {
    this.layerControl.expand()
  }

  updateMapStyle(){
    if(window.curLayer === "States"){
        this.stateLayer.eachLayer((layer) => stateLayer.resetStyle(layer))
    }
    if(window.curLayer === "Counties"){
        this.countyLayer.eachLayer((layer) => countyLayer.resetStyle(layer))
    }
  }

  addInfoBlock() {
    this.info = L.control();
    this.info.onAdd = (map) => {
        this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
        this.info.updateState();
        return this._div;
  }
}

  handleUpdateState() {
    return (props) => {
        let title = props ? `<h3>${props.statename}</h3>`:`<h3>Hover over a state</h3>`
        // Add this back when active is working again(${props.active} active)
        // And also change cases per 100,000 to use the active metric again
        let body = props ? 
            `<b>Covid19 Cases</b><br/>
            ${props.cases} total cases <br/>
            ${props.recovered} recovered<br/>
            ${props.deaths || 0} deaths<br/>
            <span class="timestamp">Updated: ${props.time_cases_update}</span><br/>
            <hr>
            <b>Population</b><br/>
            ${numberWithCommas(props.population)} people<br/>
            ${(props.pc_cases).toFixed(2)} cases per 100000<br/>
            <hr>
            
            <b>Hospital Access</b><br>
            ${props.beds} hospital beds<br/>
            ${(props.beds/(props.population/100000)).toFixed(2)} beds per 100000<br/>
            <hr>
            <b>Comparative Risk<br/></b>
            Local Risk: ${(props.risk_local).toFixed(3)}<br/>
            Nearby Risk: ${(props.risk_nearby).toFixed(3)}<br/>
            Total Risk: ${(props.risk_total).toFixed(3)}<br/>
            <hr>
            <b>Testing Data<br/></b>
            Total Tested: ${(props.test_total)}<br/>
            Tested Positive: ${(props.test_positive)}<br/>
            Tested Negative: ${(props.test_negative)}<br/>
            ${(props.test_total/(props.population/100000)).toFixed(2)} tests per 100000<br/>
            Disclosure Grade: ${props.test_grade}<br/>
            <span class="timestamp">Updated: ${props.time_tests_updated}</span><br/>
            <br>
            `
            : "<br/>"
            
        this._div.innerHTML = title + body
    }
  }

  handleUpdateCounty() {
    return (props) => {
      let cases = props.cases || 0
      let title = props ? `<h3>${props.name} County</h3>`:`<h3>Hover over a county</h3>`
      let note =  props.notes? `<span class="timestamp">${props.notes}</span><br/>`:``
      let body = props ? 
          `<b>Covid19 Cases</b><br/>
          ${cases} cases<br/>
          ${props.deaths || 0} deaths<br/>
          <span class="timestamp">Updated: ${props.time_cases_update}</span><br/>
          <hr>
          <b>Population</b><br/>
          ${numberWithCommas(props.population)} people<br/>
          ${(cases/(props.population/100000)).toFixed(2)} cases per 100000<br/>
          <hr>
          <b>Comparative Risk<br/></b>
          Local Risk: ${(props.risk_local).toFixed(3)}<br/>
          Nearby Risk: ${(props.risk_nearby).toFixed(3)}<br/>
          Total Risk: ${(props.risk_total).toFixed(3)}<br/>
          ${note}
          `
          : "<br/>"
          
      this._div.innerHTML = title + body
    }
  }

  getState(stateID) {
    return statesData["features"].find(element => element["id"] == stateID)
}

  convertStateIDToLayer(stateID){
    const layer_id = this.stateIdsToLayer[stateID]
    return this.stateLayer._layers[layer_id]
  }  

  getStateStyle(feature) {
    return {
        fillColor: getColor(feature.properties),
        weight: 1,
        opacity: 1,
        color: 'black',
        dashArray: '3',
        fillOpacity: 0.7,        
    };
  }

  onEachState(feature, layer) {
    layer.on({
        mouseover: () => this.highlightState(layer),
        mouseout: () => this.resetHighlightState(layer),
        click: () => this.zoomToCounties(layer)
    });
  }

  zoomToFeature(layer, padding) {
    this.lmap.fitBounds(layer.getBounds(), {padding:padding});
}

  zoomToCounties(layer){
    this.curState = layer.feature.properties.statename
    let menuSelect = document.querySelector('#metricSelect')
    let curMetric = getSelectedMetric().value
    this.lmap.removeLayer(this.stateLayer)
    this.lmap.addLayer(this.countyLayer)
    this.zoomToFeature(layer, padding=[100,100])   
  } 

  resetHighlightState(layer) {
    this.stateLayer.resetStyle(layer)
    this.info.updateState();
  }

  highlightState(layer) {
    layer.setStyle({
        weight: 5,
        color: '#404040',
        dashArray: '',
        fillOpacity: 0.7
    });
    this.info.updateState(layer.feature.properties);
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
  }

  getCounty(countyID){
    return countyData["features"].find(element => element["properties"]["geo_id"] == countyID)
}

  convertCountyIDToLayer(countyID){
      let layer_id = this.countyIdsToLayer[countyID]
      return this.countyLayer._layers[layer_id]
  }

  getCountyStyle(feature) {
      return {
          fillColor: getColor(feature.properties),
          weight: 1,
          opacity: 1,
          color: 'white',
          dashArray: '3',
          fillOpacity: 0.7,
      };
  }

  displayDetailed(layer){
      this.curCounty = layer.feature.properties.geo_id
      //let menuSelect = document.querySelector('#metricSelect')
      //let curMetric = getSelectedMetric().value
      this.lmap.removeLayer(this.stateLayer)
      this.lmap.addLayer(this.countyLayer)
      this.zoomToFeature(layer, padding=[300,300])
      updateSidebar()
  }


  highlightCounty(layer) {
      if (!isViewable(layer)){
          if(this.lmap.getZoom() > 7){
              this.lmap.setZoom(7)
          }
          this.lmap.panTo(layer.getBounds().getCenter())
      }
      layer.setStyle({
          weight: 5,
          dashArray: '',
          fillOpacity: 0.7
      });
      if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          layer.bringToFront();
      }
      this.info.updateCounty(layer.feature.properties);
  }

  resetHighlightCounty(layer) {
      layer.setStyle({
          weight: 1,
          opacity: 1,
          color: 'white',
          dashArray: '3',
          fillOpacity: 0.7
      });
  }

  onEachCounty(feature, layer){
    layer.on({
        mouseover: () => this.highlightCounty(layer),
        mouseout: () => this.resetHighlightCounty(layer),
        click: () => this.displayDetailed(layer),
    });
}

};






  


