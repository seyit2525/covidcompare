
class LegendControl {
  constructor (map) {
      this.map = map;
      this.legend = null
  }

  initLegendControl() {
    L.legend = L.control({position: 'bottomright'});   
    this.updateLegend() 
  }

  updateLegend(){    
    let {value:metricValue, text:metricText} = getSelectedMetric()
    let {grades, colors} = getColorsForMetric(metricValue)

    L.legend.onAdd = function (map) {
    
        var div = L.DomUtil.create('div', 'info legend'),
            
            labels = [];
    
        div.innerHTML += `<h3>${metricText}</h3>`
        // loop through our density intervals and generate a label with a colored square for each interval

        for (var i = 0; i < grades.length; i++) {
            grade_label = grades[i-1] ? `${grades[i]}&ndash;${grades[i-1]}<br>`: `${grades[i]}<br>`
            div.innerHTML +=
                `<i style="background:${colors[i]}"></i>${grade_label}`
            
        }
        return div;
    };
    L.legend.addTo(map);
  }
}

