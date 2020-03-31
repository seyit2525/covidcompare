class App {
  constructor () {
      this.map = null;
      this.sidebar = null;
      this.curLayer = "States";
      this.curState = null;
      this.accessToken = API_KEY_MAPBOX;
  }

  init() {
    this.addMap()
    this.addSidebar()
    this.setBaseLayerHandling()
  }

  addMap() {
    this.map = new Map
    this.map.initMap(this.accessToken)
  }

  addSidebar() {
    this.sidebar = new Sidebar(this.map)
    this.sidebar.initSidebar()
    this.sidebar.addSidebar()    
    this.sidebar.getSidebarData()
    this.sidebar.initSidebarControls()
    this.sidebar.updateSidebar()
  }

  setBaseLayerHandling() {
    this.map.lmap.on('baselayerchange', function (e) {
      window.curLayer = e.name
      this.sidebar.initSidebarControls()
      this.sidebar.updateSidebar()
      this.map.updateMapStyle()
      this.map.legendControl.updateLegend()
  });
  }  
}