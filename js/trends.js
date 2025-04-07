const CHART_WIDTH = 1200;
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
        transformed_data.push({
            date:d,
            label:transform_x_labels(d),
            weekday:{
                counts:[],
                delays:[]
            },
            weekend:{
                counts:[],
                delays:[]
            }
        })
    })

    // console.log(data)

    data.forEach(d=>{
        transformed_data
            .filter(sd => sd.date === d['0'])
            .forEach(sd => {
                if(d['1']===true){
                    d3.range(2,7).forEach(idx => sd.weekday.counts[idx-2] = d[idx])
                    d3.range(7, 12).forEach(idx => sd.weekday.delays[idx-7] = d[idx])
                }
                else {
                    d3.range(2,7).forEach(idx => sd.weekend.counts[idx-2] = d[idx])
                    d3.range(7, 12).forEach(idx => sd.weekend.delays[idx-7] = d[idx])
                }
        } )
    })

    transformed_data.sort((a, b) => a['date'].split('-')[0] - b['date'].split('-')[0] ||
        a['date'].split('-')[1] - b['date'].split('-')[1])

    // console.log(transformed_data)

    filter_data(transformed_data)
}

function filter_data(data, control){

    let { week, delays_control } = get_trends_controls()

    let filter_data = data.map(({ label, date, weekday, weekend }) => {

        let count = []
        let delays = []
        if(week !== null){
            if(week === true){
                count = weekday.counts
                delays = weekday.delays
            }
            else{
                count = weekend.counts
                delays = weekend.delays
            }
        }
        else{
            d3.range(5).forEach(key => count[key] = weekday.counts[key] + weekend.counts[key] )
            d3.range(5).forEach(key => delays[key] = weekday.delays[key] + weekend.delays[key])
        }

        let delay_idx = delays_control
        if(delay_idx.length === 0){
            delay_idx = d3.range(5)
        }

        count = delay_idx.reduce((sum, key) => sum + count[key], 0)
        delays = delay_idx.reduce((sum, key) => sum + delays[key], 0)

        return {label, date, count:count / 1000, delays:delays / 60000}
    });


    // console.log(data)
    // console.log(filter_data)

    trend_render(filter_data)
}

function render_line(data) {

    let max_val = Math.max(...data.map(d => d.delays))
    const color = d3.scaleSequential([0, max_val], d3.interpolateReds)

    d3.select('#trends-graph')
        .attr("width", CHART_WIDTH)
        .attr("height", CHART_HEIGHT)

    d3.select('#trends-graph #plot')
        .attr("transform",
            "translate(" + MARGIN.left + "," + MARGIN.top + ")")

    let x = d3.scaleBand()
        .domain(d3.map(data, d => d.label))
        .range([0, WIDTH])

    d3.select('#trends-graph #x-axis')
        .attr("transform", `translate(0,${HEIGHT})`)
        .transition()
        .duration(1000)
        .call(d3.axisBottom(x).tickSizeOuter(0))

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.delays)])
        .range([HEIGHT, 0])
        .nice()

    d3.select('#trends-graph #y-axis')
        .transition()
        .duration(1000)
        .call(d3.axisLeft(y))

    const line_width_scale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.delays)])
        .range([0.5, 7])


    const segments = data.slice(1).map((d, i) => [data[i], d])

    const lines = d3.select('#trends-graph #line-segments').selectAll('line').data(segments)

    lines.enter()
        .append('line')
        .attr('x1', d=> x(d[0].label) + x.bandwidth() / 2)
        .attr('y1', d=> y(d[0].delays))
        .attr('x2', d=> x(d[1].label) + x.bandwidth() / 2)
        .attr('y2', d=> y(d[1].delays))
        .attr('stroke', d=> color((d[0].delays + d[1].delays)/2))
        .attr('stroke-width', d=> line_width_scale(d[0].delays + d[0].delays))


    const points = d3.select('#trends-graph #points').selectAll('circle').data(data)

    points.enter()
        .append('circle')
        .attr('r', d => line_width_scale(d.delays))
        .attr('cx', d=>x(d.label) + x.bandwidth() / 2)
        .attr('cy', d=>y(d.delays))
        .attr('stroke-width', d=> line_width_scale(d.delays))
        .attr('fill', d=>color(d.delays))

}

function render_volume(data) {

    let x = d3.scaleBand()
        .domain(d3.map(data, d => d.label))
        .range([0, WIDTH])

    const height =  250
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .range([height, 0])
        .nice()

    const bars = d3.select('#trends-graph #volume')
        .selectAll('rect').data(data)

    let max_val = Math.max(...data.map(d => d.count))
    const color = d3.scaleSequential([0, max_val], d3.interpolateGnBu)

    bars.join(
        enter => enter
            .append('rect')
            .attr("width", x.bandwidth())
            .attr("x", d => x(d.label))
            .attr("y", d => y(d.count) + HEIGHT - height)
            .attr("height", d => height - y(d.count))
            .attr('fill', d => color(d.count))
            .style('opacity', 0)
            .transition()
            .duration(1000)
            .style('opacity', 0.7),
        update => update
            .transition()
            .duration(1000)
            .attr("width", x.bandwidth())
            .attr("x", d => x(d.label))
            .attr("y", d => y(d.count) + HEIGHT - height)
            .attr("height", d => height - y(d.count))
            .attr('fill', d => color(d.count))
            .style('opacity', 0.7),

        exit => exit.transition()
            .duration(1000)
            .style('opacity', 0)
            .remove()
    )
}

function get_trends_controls(){

    let controls = {
        "week":null,
        "delays_control":[]
    }

    let $form = $("#trends-controls input")

    for (let i = 0; i < $form.length; i++) {
        let $ele = $($form[i])

        let id = $ele.attr('id')

        if(id.includes('delay')){
            if($ele.prop('checked')){
                controls['delays_control'].push(DELAY_DATA_MAPPING[id.split('-')[0]] - 5)
            }
        }
        else if(id.includes('week')){
            if($ele.prop('checked')){
                let k = id.split('-')[0]
                controls['week'] = k==='weekday'
            }
        }
    }

    // console.log(controls)

    return controls
}

function trend_render(data){

    render_line(data)

    render_volume(data)
}

$(document).ready(function(){
    populateTrends()

    $("#trends-controls .form-check-input").on('change', function (){
        setTimeout(function (){populateTrends()}, 50)
    })

})