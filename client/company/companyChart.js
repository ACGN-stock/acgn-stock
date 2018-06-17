import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';

import { globalVariable } from '/client/utils/globalVariable';
import { currencyFormat, setChartTheme } from '/client/utils/helpers';
import { paramCompanyId } from './helpers';

Template.companyChart.onCreated(function() {
  this.strChartType = '';
  this.$chart = null;
});

Template.companyChart.onRendered(function() {
  this.strChartType = 'trend';
  this.$chart = this.$('.chart');
  this.autorun(() => {
    drawChart(this);
  });
});

Template.companyChart.events({
  'click [data-chart-type]'(event, templateInstance) {
    event.preventDefault();
    const chartType = $(event.currentTarget).attr('data-chart-type');
    $('.company-detail .company-chart-btn-group > .active').removeClass('active');
    $('.company-detail .company-chart-btn-group')
      .find(`[data-chart-type="${chartType}"]`)
      .addClass('active');
    templateInstance.strChartType = chartType;
    drawChart(templateInstance);
  }
});

function drawChart(templateInstance) {
  switch (globalVariable.get('theme')) {
    case 'dark':
      setChartTheme('gray');
      break;
    default:
      setChartTheme('gridLight');
      break;
  }

  if (templateInstance.strChartType === 'trend') {
    drawLineChart(templateInstance);
  }
  else {
    drawCandleStickChart(templateInstance);
  }
}

function drawLineChart(templateInstance) {
  if (! Meteor.status().connected) {
    return false;
  }
  if (templateInstance.$chart) {
    templateInstance.$chart.empty();
  }

  const toTime = Date.now();
  const fromTime = toTime - 1000 * 60 * 60 * 24;
  const companyId = paramCompanyId();
  Meteor.call('queryStocksPrice', companyId, { begin: fromTime }, (error, result) => {
    if (error) {
      return false;
    }

    Highcharts.chart({
      chart: {
        type: 'line',
        renderTo: templateInstance.$chart[0]
      },
      title: {
        text: '一日股價走勢',
        margin: 0
      },
      yAxis: {
        title: {
          text: null
        },
        labels: {
          x: -4,
          formatter: function() {
            return `$${currencyFormat(this.value)}`;
          }
        },
        allowDecimals: false,
        min: 0,
        minTickInterval: 1,
        tickPixelInterval: 50
      },
      xAxis: {
        type: 'datetime',
        min: fromTime,
        max: toTime,
        gridLineWidth: 1,
        tickWidth: 0,
        tickPixelInterval: 75
      },
      legend: {
        enabled: false
      },
      credits: {
        enabled: false
      },
      series: [
        {
          name: '價格',
          data: _.sortBy(result, 'x'),
          marker: {
            enabled: true
          },
          tooltip: {
            valueDecimals: 0,
            xDateFormat: '%H:%M:%S',
            pointFormatter: function() {
              return `<span style="color:${this.color}">\u25CF</span> ${this.series.name}: <b>$${currencyFormat(this.y)}</b><br/>`;
            }
          }
        }
      ]
    });
  });
}

function drawCandleStickChart(templateInstance) {
  if (! Meteor.status().connected) {
    return false;
  }
  if (templateInstance.$chart) {
    templateInstance.$chart.empty();
  }

  const unitTime = (templateInstance.strChartType === '1hr' ? 3600
    : templateInstance.strChartType === '2hr' ? 7200
      : templateInstance.strChartType === '4hr' ? 14400
        : templateInstance.strChartType === '12hr' ? 43200 : 86400) * 1000;

  const count = Math.min(Math.floor((1000 * 86400 * 14) / unitTime) - 1, 40);

  const toTime = Math.floor(Date.now() / unitTime) * unitTime;
  const fromTime = toTime - unitTime * (count - 1);

  const companyId = paramCompanyId();
  Meteor.call('queryStocksCandlestick', companyId, { lastTime: toTime, unitTime: unitTime, count: count }, (error, result) => {
    if (error) {
      return false;
    }

    const data = _.map(result, (val) => {
      const newVal = {
        x: val.time,
        open: val.open,
        high: val.high,
        low: val.low,
        close: val.close
      };

      return newVal;
    });

    Highcharts.stockChart({
      chart: {
        renderTo: templateInstance.$chart[0]
      },
      title: {
        text: null
      },
      rangeSelector: {
        enabled: false
      },
      scrollbar: {
        enabled: false
      },
      navigator: {
        enabled: false
      },
      yAxis: {
        title: {
          text: null
        },
        labels: {
          x: -4,
          y: 3,
          align: 'right',
          formatter: function() {
            return `$${currencyFormat(this.value)}`;
          }
        },
        allowDecimals: false,
        opposite: false,
        showLastLabel: true,
        minTickInterval: 1,
        tickPixelInterval: 50
      },
      xAxis: {
        type: 'datetime',
        min: fromTime,
        max: toTime,
        startOnTick: true,
        gridLineWidth: 1,
        minTickInterval: 1,
        tickWidth: 0,
        tickPixelInterval: 75,
        ordinal: false
      },
      legend: {
        enabled: false
      },
      credits: {
        enabled: false
      },
      series: [
        {
          name: '成交價',
          type: 'candlestick',
          data: data,
          cropThreshold: count,
          maxPointWidth: 10,
          color: '#449d44',
          lineColor: '#449d44',
          upLineColor: '#d9534f',
          upColor: '#d9534f',
          tooltip: {
            valueDecimals: 0,
            xDateFormat: '%m/%d %H:%M',
            pointFormatter: function() {
              return (
                `Open: <b>$${
                  currencyFormat(this.options.open)
                }</b><br/>` +
                `High: <b>$${
                  currencyFormat(this.options.high)
                }</b><br/>` +
                `Low: <b>$${
                  currencyFormat(this.options.low)
                }</b><br/>` +
                `Close: <b>$${
                  currencyFormat(this.options.close)
                }</b><br/>`
              );
            }
          }
        }
      ]
    });
  });
}
