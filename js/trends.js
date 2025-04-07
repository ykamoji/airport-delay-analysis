const CHART_WIDTH = 1400;
const CHART_HEIGHT = 500;
const MARGIN = { left: 45, bottom: 20, top: 20, right: 20 };
const HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom
const WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
function populateTrends(){

    if (CACHE.has('all_trends')){
        data_render(CACHE.get('all_trends'))
    }
    else{
        $.getJSON("assets/all_trends.json", function(data) {
            CACHE.set('all_trends', data)
            data_render(data)
        });
    }
}

function transform_x_labels(label){
    return MONTHS[label.split('-')[1]-1] + ' ' + label.split('-')[0].slice(2,4)
}

function data_render(data){

    let dates = new Set(data.map(d=>d['0']))
    let transformed_data = []

    dates.forEach(d => {
        transformed_data.push({date:d,
            label:transform_x_labels(d),
            weekday:{
                count:0,
                sum:0,
                delays:[]
            },
            weekend:{
                count:0,
                sum:0,
                delays:[]
            }
        })
    })

    // console.log(data)

    data.forEach(d=>{
        transformed_data
            .filter(sd => sd.date === d['0'])
            .forEach(sd => {
                let count = d3.range(2,7).reduce((sum, key) => sum + d[key+''], 0) / 1000
                let sum = d3.range(7, 12).reduce((sum, key) => sum + d[key+''], 0) / (60 * 1000)
                if(d['1']===true){
                    sd.weekday.count = count
                    sd.weekday.sum = sum
                    d3.range(7, 12).forEach(idx => sd.weekday.delays[idx-7] = d[idx])
                }
                else {
                    sd.weekend.count = count
                    sd.weekend.sum = sum
                    d3.range(7, 12).forEach(idx => sd.weekend.delays[idx-7] = d[idx])
                }

        } )
    })

    transformed_data.sort((a, b) => a['date'].split('-')[0] - b['date'].split('-')[0] ||
        a['date'].split('-')[1] - b['date'].split('-')[1])

    console.log(transformed_data)

    trend_render(transformed_data)
}

function trend_render(data){


    d3.select('#trends-graph')
        .attr("width", CHART_WIDTH)
        .attr("height", CHART_HEIGHT)

    d3.select('#trends-graph #plot')
        .attr("transform",
            "translate(" + MARGIN.left + "," + MARGIN.top + ")")

    let x = d3.scalePoint()
        .domain(d3.map(data, d => d.label))
        .range([0, WIDTH])

    d3.select('#trends-graph #x-axis')
        .attr("transform", `translate(0,${HEIGHT})`)
        .transition()
        .duration(1000)
        .call(d3.axisBottom(x).tickSizeOuter(0))

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.weekend.sum + d.weekend.sum)])
        .range([HEIGHT, 0])
        .nice()

    d3.select('#trends-graph #y-axis')
        .transition()
        .duration(1000)
        .call(d3.axisLeft(y))

    const path = d3.line()
        .x(d => x(d.label))
        .y(d => y(d.weekend.sum + d.weekend.sum))


    const line = d3.select('#trends-graph #line')
        .datum(data)

    line.join(enter => enter.attr("d", path),
            update => update.attr("d", path))

}

$(document).ready(function(){
    populateTrends()
})