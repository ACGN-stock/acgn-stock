/**
 * (c) 2010-2017 Torstein Honsi
 *
 * License: www.highcharts.com/license
 *
 * Dark theme for Highcharts JS
 * @author Torstein Honsi
 */

import { _ } from 'meteor/underscore';

Highcharts.theme = {};

Highcharts.theme.default = _.extend({}, Highcharts.getOptions());

Highcharts.theme.gray = {
  colors: ['#DDDF0D', '#7798BF', '#55BF3B', '#DF5353', '#aaeeee',
    '#ff0066', '#eeaaee', '#55BF3B', '#DF5353', '#7798BF', '#aaeeee'],
  chart: {
    backgroundColor: null,
    borderWidth: 0,
    borderRadius: 0,
    plotBackgroundColor: null,
    plotShadow: false,
    plotBorderWidth: 0
  },
  title: {
    style: {
      color: '#FFF',
      font: '16px Lucida Grande, Lucida Sans Unicode,' +
        ' Verdana, Arial, Helvetica, sans-serif'
    }
  },
  subtitle: {
    style: {
      color: '#DDD',
      font: '12px Lucida Grande, Lucida Sans Unicode,' +
        ' Verdana, Arial, Helvetica, sans-serif'
    }
  },
  xAxis: {
    gridLineWidth: 0,
    lineColor: '#999',
    tickColor: 'rgba(255,255,255,0.07)',
    gridLineColor: 'rgba(255, 255, 255, .1)',
    minorGridLineColor: 'rgba(255,255,255,0.07)',
    labels: {
      style: {
        color: '#999',
        fontWeight: 'bold'
      }
    },
    title: {
      style: {
        color: '#AAA',
        font: 'bold 12px Lucida Grande, Lucida Sans Unicode,' +
        ' Verdana, Arial, Helvetica, sans-serif'
      }
    }
  },
  yAxis: {
    alternateGridColor: null,
    minorTickInterval: null,
    gridLineColor: 'rgba(255, 255, 255, .1)',
    minorGridLineColor: 'rgba(255,255,255,0.07)',
    lineWidth: 0,
    tickWidth: 0,
    labels: {
      style: {
        color: '#999',
        fontWeight: 'bold'
      }
    },
    title: {
      style: {
        color: '#AAA',
        font: 'bold 12px Lucida Grande, Lucida Sans Unicode,' +
        ' Verdana, Arial, Helvetica, sans-serif'
      }
    }
  },
  legend: {
    itemStyle: {
      color: '#CCC'
    },
    itemHoverStyle: {
      color: '#FFF'
    },
    itemHiddenStyle: {
      color: '#333'
    }
  },
  labels: {
    style: {
      color: '#CCC'
    }
  },
  tooltip: {
    backgroundColor: {
      linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
      stops: [
        [0, 'rgba(96, 96, 96, .8)'],
        [1, 'rgba(16, 16, 16, .8)']
      ]
    },
    borderWidth: 0,
    style: {
      color: '#FFF'
    }
  },


  plotOptions: {
    series: {
      nullColor: '#444444',
      dataLabels: {
        color: '#CCC'
      }
    },
    line: {
      dataLabels: {
        color: '#CCC'
      },
      marker: {
        lineColor: '#333'
      }
    },
    spline: {
      marker: {
        lineColor: '#333'
      }
    },
    scatter: {
      marker: {
        lineColor: '#333'
      }
    },
    candlestick: {
      lineColor: 'white'
    }
  },

  toolbar: {
    itemStyle: {
      color: '#CCC'
    }
  },

  navigation: {
    buttonOptions: {
      symbolStroke: '#DDDDDD',
      hoverSymbolStroke: '#FFFFFF',
      theme: {
        fill: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0.4, '#606060'],
            [0.6, '#333333']
          ]
        },
        stroke: '#000000'
      }
    }
  },

  // scroll charts
  rangeSelector: {
    buttonTheme: {
      fill: {
        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
        stops: [
          [0.4, '#888'],
          [0.6, '#555']
        ]
      },
      stroke: '#000000',
      style: {
        color: '#CCC',
        fontWeight: 'bold'
      },
      states: {
        hover: {
          fill: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0.4, '#BBB'],
              [0.6, '#888']
            ]
          },
          stroke: '#000000',
          style: {
            color: 'white'
          }
        },
        select: {
          fill: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0.1, '#000'],
              [0.3, '#333']
            ]
          },
          stroke: '#000000',
          style: {
            color: 'yellow'
          }
        }
      }
    },
    inputStyle: {
      backgroundColor: '#333',
      color: 'silver'
    },
    labelStyle: {
      color: 'silver'
    }
  },

  navigator: {
    handles: {
      backgroundColor: '#666',
      borderColor: '#AAA'
    },
    outlineColor: '#CCC',
    maskFill: 'rgba(16, 16, 16, 0.5)',
    series: {
      color: '#7798BF',
      lineColor: '#A6C7ED'
    }
  },

  scrollbar: {
    barBackgroundColor: {
      linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
      stops: [
        [0.4, '#888'],
        [0.6, '#555']
      ]
    },
    barBorderColor: '#CCC',
    buttonArrowColor: '#CCC',
    buttonBackgroundColor: {
      linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
      stops: [
        [0.4, '#888'],
        [0.6, '#555']
      ]
    },
    buttonBorderColor: '#CCC',
    rifleColor: '#FFF',
    trackBackgroundColor: {
      linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
      stops: [
        [0, '#000'],
        [1, '#333']
      ]
    },
    trackBorderColor: '#666'
  },

  // special colors for some of the demo examples
  legendBackgroundColor: 'rgba(48, 48, 48, 0.8)',
  background2: 'rgb(70, 70, 70)',
  dataLabelsColor: '#444',
  textColor: '#E0E0E0',
  maskColor: 'rgba(255,255,255,0.3)'
};

Highcharts.createElement('link', {
  href: 'https://fonts.googleapis.com/css?family=Unica+One',
  rel: 'stylesheet',
  type: 'text/css'
}, null, document.getElementsByTagName('head')[0]);

Highcharts.theme.darkUnica = {
  colors: ['#2b908f', '#90ee7e', '#f45b5b', '#7798BF', '#aaeeee', '#ff0066',
    '#eeaaee', '#55BF3B', '#DF5353', '#7798BF', '#aaeeee'],
  chart: {
    backgroundColor: null,
    style: {
      fontFamily: '\'Unica One\', sans-serif'
    },
    plotBorderColor: '#606063'
  },
  title: {
    style: {
      color: '#E0E0E3',
      textTransform: 'uppercase',
      fontSize: '20px'
    }
  },
  subtitle: {
    style: {
      color: '#E0E0E3',
      textTransform: 'uppercase'
    }
  },
  xAxis: {
    gridLineColor: '#707073',
    labels: {
      style: {
        color: '#E0E0E3'
      }
    },
    lineColor: '#707073',
    minorGridLineColor: '#505053',
    tickColor: '#707073',
    title: {
      style: {
        color: '#A0A0A3'

      }
    }
  },
  yAxis: {
    gridLineColor: '#707073',
    labels: {
      style: {
        color: '#E0E0E3'
      }
    },
    lineColor: '#707073',
    minorGridLineColor: '#505053',
    tickColor: '#707073',
    tickWidth: 1,
    title: {
      style: {
        color: '#A0A0A3'
      }
    }
  },
  tooltip: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    style: {
      color: '#F0F0F0'
    }
  },
  plotOptions: {
    series: {
      dataLabels: {
        color: '#B0B0B3'
      },
      marker: {
        lineColor: '#333'
      },
      color: 'white'
    },
    boxplot: {
      fillColor: '#505053'
    },
    candlestick: {
      lineColor: 'white'
    },
    errorbar: {
      color: 'white'
    }
  },
  legend: {
    itemStyle: {
      color: '#E0E0E3'
    },
    itemHoverStyle: {
      color: '#FFF'
    },
    itemHiddenStyle: {
      color: '#606063'
    }
  },
  credits: {
    style: {
      color: '#666'
    }
  },
  labels: {
    style: {
      color: '#707073'
    }
  },

  drilldown: {
    activeAxisLabelStyle: {
      color: '#F0F0F3'
    },
    activeDataLabelStyle: {
      color: '#F0F0F3'
    }
  },

  navigation: {
    buttonOptions: {
      symbolStroke: '#DDDDDD',
      theme: {
        fill: '#505053'
      }
    }
  },

  // scroll charts
  rangeSelector: {
    buttonTheme: {
      fill: '#505053',
      stroke: '#000000',
      style: {
        color: '#CCC'
      },
      states: {
        hover: {
          fill: '#707073',
          stroke: '#000000',
          style: {
            color: 'white'
          }
        },
        select: {
          fill: '#000003',
          stroke: '#000000',
          style: {
            color: 'white'
          }
        }
      }
    },
    inputBoxBorderColor: '#505053',
    inputStyle: {
      backgroundColor: '#333',
      color: 'silver'
    },
    labelStyle: {
      color: 'silver'
    }
  },

  navigator: {
    handles: {
      backgroundColor: '#666',
      borderColor: '#AAA'
    },
    outlineColor: '#CCC',
    maskFill: 'rgba(255,255,255,0.1)',
    series: {
      color: '#7798BF',
      lineColor: '#A6C7ED'
    },
    xAxis: {
      gridLineColor: '#505053'
    }
  },

  scrollbar: {
    barBackgroundColor: '#808083',
    barBorderColor: '#808083',
    buttonArrowColor: '#CCC',
    buttonBackgroundColor: '#606063',
    buttonBorderColor: '#606063',
    rifleColor: '#FFF',
    trackBackgroundColor: '#404043',
    trackBorderColor: '#404043'
  },

  // special colors for some of the
  legendBackgroundColor: 'rgba(0, 0, 0, 0.5)',
  background2: '#505053',
  dataLabelsColor: '#B0B0B3',
  textColor: '#C0C0C0',
  contrastTextColor: '#F0F0F3',
  maskColor: 'rgba(255,255,255,0.3)'
};

Highcharts.createElement('link', {
  href: 'https://fonts.googleapis.com/css?family=Dosis:400,600',
  rel: 'stylesheet',
  type: 'text/css'
}, null, document.getElementsByTagName('head')[0]);

Highcharts.theme.gridLight = {
  colors: ['#7cb5ec', '#f7a35c', '#90ee7e', '#7798BF', '#aaeeee', '#ff0066',
    '#eeaaee', '#55BF3B', '#DF5353', '#7798BF', '#aaeeee'],
  chart: {
    backgroundColor: null,
    style: {
      fontFamily: 'Dosis, sans-serif'
    }
  },
  title: {
    style: {
      fontSize: '16px',
      fontWeight: 'bold',
      textTransform: 'uppercase'
    }
  },
  tooltip: {
    borderWidth: 0,
    backgroundColor: 'rgba(219,219,216,0.8)',
    shadow: false
  },
  legend: {
    itemStyle: {
      fontWeight: 'bold',
      fontSize: '13px'
    }
  },
  xAxis: {
    labels: {
      style: {
        fontSize: '12px'
      }
    }
  },
  yAxis: {
    title: {
      style: {
        textTransform: 'uppercase'
      }
    },
    labels: {
      style: {
        fontSize: '12px'
      }
    }
  },
  plotOptions: {
    candlestick: {
      lineColor: '#404048'
    }
  },

  // General
  background2: '#F0F0EA'
};
