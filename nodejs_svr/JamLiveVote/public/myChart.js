/**
 * Created by nnnyyy on 6/3/2018.
 */
var color = ['#DE5B49','#3AA84B', '#F0CA4D', '#006b9d' ];

function showBarChart(ct_elem_name, labelSeries, dataSeries, options) {
    var data = {
        labels: labelSeries,
        series: dataSeries
    };

    var chart = new Chartist.Bar(ct_elem_name, data, options);
    chart.on('draw', function(context) {
        if( context.type == 'bar') {
            var c = color[context.index % 4];
            context.element.attr({

                // Now we set the style attribute on our bar to override the default color of the bar. By using a HSL colour we can easily set the hue of the colour dynamically while keeping the same saturation and lightness. From the context we can also get the current value of the bar. We use that value to calculate a hue between 0 and 100 degree. This will make our bars appear green when close to the maximum and red when close to zero.
                style: 'stroke: ' + c
            });
        }
    })
}