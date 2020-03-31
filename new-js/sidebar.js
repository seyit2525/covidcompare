class Sidebar {
  constructor (map) {
      this.map = map;
      this.data = null;
      this.curState = window.curState;
      this.curLayer = window.curLayer;
      this.curCounty = window.curCounty;
      this.dataDiv = document.querySelector(".data")   
      this.options_list = [] 
      this.selectMenu = null
      this.controlsDiv = null
      this.header = null
      this.note = null      
  }

  initSidebar() {
      this.addSidebar()    
      this.getSidebarData()
      this.initSidebarControls()
      this.updateSidebar()           
  }

  addSidebar() {
    this.sidebar = L.control.sidebar({container:'sidebar'})
    .addTo(this.map.lmap)
    .open('home');    
  }

  getSidebarData(){
      let sidebarData = this.curLayer === "States" ? stateData["features"]:countyData["features"]
      //if we've selected a current state, filter to only show data from that state
      if(this.curState){
          let filt = filterByProp("statename", curState)
          sidebarData = sidebarData.filter(filt)
      }
      this.data=sidebarData
  }

  updateSidebar() {
      const dataDiv = document.querySelector(".data")
      
      this.dataDiv.innerHTML = ''
      if(this.curCounty){
          populateSidebarDetailed(this.dataDiv, this.data)
      }
      else if(this.map.curLayer === "States"){        
          this.populateSidebarState(this.dataDiv, this.data)
      }
      else{
          this.populateSidebarCounty(this.dataDiv, this.data)
      }
  }    

  getUnassigned(stateName, metric) {
      if(!["cases", "deaths"].includes(metric)){
          return null;
      }
      let filt = filterByProp("statename", stateName)
      let state = stateData["features"].filter(filt)[0]
      let value = metric === "cases"? state["properties"]["unassigned_cases"]:state["properties"]["unassigned_deaths"]
      return value
  }
  
  initSidebarControls(){
      let curValue = getSelectedMetric()
      this.controlsDiv = document.querySelector(".controls")
      let Button = this.getResetButton()
      this.selectMenu = this.getSelectMenu()
      //Make sure we keep the selected value 
      if (curValue){
          this.selectMenu.value = curValue.value
      }
      this.controlsDiv.innerHTML = ""
      this.controlsDiv.append(this.selectMenu, this.getResetButton())
  }

  resetMap = () => {
      window.curState = null
      window.curCounty = null
      this.map.lmap.setView([42, -104], 5);
      this.map.lmap.removeLayer(countyLayer)
      this.map.lmap.addLayer(stateLayer)
      this.updateSidebar()
  }
  
  getResetButton() {
      let resetButton = document.createElement('input')
      resetButton.type = "button"
      resetButton.value = "Reset Map"
  
      resetButton.classList.add("btn", "btn-primary") 
      resetButton.onclick = this.resetMap
      return resetButton
  }
  
  getBackToStateButton(stateName, curStateLayer) {
      let backToStateButton = document.createElement('input')
      backToStateButton.type = "button"
      backToStateButton.value = `Back to ${stateName}`
      backToStateButton.classList.add("btn", "btn-primary") 
      backToStateButton.onclick = function(){
          window.curState = stateName
          window.curCounty = null;
          zoomToFeature(curStateLayer, padding=[100,100])
          this.updateSidebar()
      }
      return backToStateButton
  }
  
  getAllOptions(sections){
      let option_list = []
      for(let section of sections){
          for(let val of Object.values(section)){
              option_list.push(val)
          }
      }
      return option_list
  }
  
  getSelectMenu(){
      let layerName = window.curLayer
      let oldValue =  getSelectedMetric().value
      let options = layerName === 'States'?
                      //Menu Options for States
                      {
                          "Case Data":
                          {
                              "Total Cases":"cases", 
                              //"Active":"active", 
                              "Recovered":"recovered", 
                              "Deaths":"deaths",
                          },
                          "Per Capita":
                          {
                              "Cases per 100,000":"pc_cases", 
                              //"Active per 100,000":"pc_active", 
                              "Deaths per 100,000":"pc_deaths",
                          },
                          "Risk Data":
                          {
                              "Total Risk":"risk_total", 
                              "Local Risk":"risk_local", 
                              "Nearby Risk":"risk_nearby",
                          },
                          "Testing Data":
                          {
                              "Total Tests":"test_total", 
                              "Tests per 100,000":"pc_tests",
                          },
                      }
                      :
                      //Menu Options for Counties
                      {
                          "Case Data":
                          {
                              "Total Cases":"cases", 
                              "Deaths":"deaths", 
                              "Cases per 100,000":"pc_cases",
                              "Deaths per 100,000":"pc_deaths",
                          },
                          "Risk Data":
                          {
                              "Total Risk":"risk_total",
                              "Local Risk":"risk_local",
                              "Nearby Risk":"risk_nearby",
                          },
                      }
      let selectMenu = document.createElement('select')
      selectMenu.id = "metricSelect"
      for (let category of Object.keys(options)){
          let menuOption = document.createElement('option')
          menuOption.text = "  ---" + category + "---"
          menuOption.disabled = "disabled"
          menuOption.style = "font-weight:bold;"
          selectMenu.appendChild(menuOption)
          for (let displayName of Object.keys(options[category])){
              let menuOption = document.createElement('option')
              menuOption.value  = options[category][displayName]
              menuOption.text = displayName
              selectMenu.appendChild(menuOption)
          }
      }
      if(this.getAllOptions(Object.values(options)).includes(oldValue)){
          selectMenu.value = oldValue
      }
      else {
          selectMenu.text = "Total Cases"
          selectMenu.value = "cases"
      }
      selectMenu.addEventListener("change", ()=> {
          updateSidebar()
          updateMapStyle()
          updateLegend()
      })
      return selectMenu
  }
  
  
  populateSidebarState(dataDiv, sidebarData){
      let totalCases = 0    
      let region = window.curState ? window.curState:"United States"
      let {text:metricText, value:metric} = getSelectedMetric()
      let newOL = document.createElement('ol')
  
      for(let state of sidebarData.sort(sortByProp(metric))){
          let newLI = document.createElement('li')
          let {statename, cases, lat, long} = state["properties"]
          let curMetric = state["properties"][metric]
          totalCases += curMetric
          if(["risk_total", "risk_local", "risk_nearby", "pc_cases", "pc_tests", "pc_active", "pc_deaths"].includes(metric)){
              curMetric = curMetric.toFixed(3)
              totalCases = ""
          }
          newLI.innerHTML = `<a>${state["properties"]["statename"]}</a> - ${curMetric} ${metricText}`
          let curLayer = this.map.convertStateIDToLayer([state["id"]])
          newLI.addEventListener("mouseover", (e) => this.map.highlightState(curLayer))
          newLI.addEventListener("mouseout", (e) => this.map.resetHighlightState(curLayer))
          newLI.addEventListener("click", (e) => this.map.zoomToCounties(curLayer))
          newOL.appendChild(newLI)
      }
      this.header = document.createElement('h3')
      this.header.innerText = `${metricText} in ${region}: ${totalCases}`
      dataDiv.append(this.header,  newOL)
  }
  
  populateSidebarCounty(dataDiv, sidebarData){
      let totalCases = 0
      let curState = window.curState
      let region = curState ? curState:"United States"
      let {text:metricText, value:metric} = getSelectedMetric()
      let newOL = document.createElement('ol')
      for(let county of sidebarData.sort(sortByProp(metric))){
          let newLI = document.createElement('li')
          let {name, statename, cases, geo_id:countyID} = county["properties"]
          let curMetric = county["properties"][metric]
          if(curMetric <= 0){
              break
          }
          totalCases += curMetric
          if(["risk_total", "risk_local", "risk_nearby", "pc_cases", "pc_deaths"].includes(metric)){
              curMetric = curMetric.toFixed(3)
              totalCases = ""
          }
          let curLayer = this.map.convertCountyIDToLayer(countyID)
          newLI.innerHTML = `<a>${name}, ${statename}</a> ${curMetric}  ${metricText}`
          newLI.addEventListener("mouseover", (e) => this.map.highlightCounty(curLayer))
          newLI.addEventListener("mouseout", (e) => this.map.resetHighlightCounty(curLayer))
          newLI.addEventListener("click", (e) => displayDetailed(curLayer, padding=[100,100]))
          //newLI.addEventListener("mouseover", () => info.updateCounty(county["properties"]))
          newOL.appendChild(newLI)
      }
      if(curState && ["cases", "deaths"].includes(metric)){
          let curMetric = getUnassigned(curState, metric)
          if(curMetric){
              let newLI = document.createElement('li')
              newLI.innerHTML = `<strong>Unassigned</strong>, ${curState} ${curMetric} ${metricText}`
              newOL.appendChild(newLI)
              totalCases += curMetric
          }
      }
      let header = document.createElement('h3')
      header.innerText = `${metricText} in ${region}: ${totalCases}`
      this.note = document.createElement('span')
      this.note.innerText  = `Note: States sometimes report cases with county "unassigned", thus county totals for cases and deaths may be lower. For accurate totals, please view data by state, not county.`
      this.note.classList.add('discrepancy')
      this.dataDiv.append(header, this.note, newOL)
  }
  
  populateSidebarDetailed(dataDiv){
      let countyID = window.curCounty
      let props = getCounty(countyID)["properties"]
      console.log(props)
      let {name, statename, stateabbr, cases, state:stateID, } = props
      curStateLayer = convertStateIDToLayer(stateID)
      header = document.createElement('h2')
      header.innerText = `${name} County, ${stateabbr}`
      header2 = document.createElement('h4')
      header2.innerText = `Lots of new stuff will be posted here in the next few days including time trends, growth rates, county health data, ICU capacity and more.`
      header2.style.color = "blue"
  
      let content = document.createElement('div')
      let note =  props.notes? `<span class="timestamp">${props.notes}</span><br/>`:``
      let body =`<br/><b>Covid19 Cases</b><br/>
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
      content.innerHTML = body
      let backToStateButton = getBackToStateButton(statename, curStateLayer)
      dataDiv.append(header, header2, backToStateButton, content, )      
  }    

}


function sortByProp(prop, descending=true){
  return descending ?
         ((a, b) => a["properties"][prop] > b["properties"][prop] ? -1 : 1)
         :((a, b) => a["properties"][prop] > b["properties"][prop] ? 1 : -1)
}


function filterByProp(prop, value){
  return (item) => item["properties"][prop] == value
}




