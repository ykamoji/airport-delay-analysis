const CHART_WIDTH = 1400;
const CHART_HEIGHT = 550;
const MARGIN = { left: 25, bottom: 20, top: 50, right: 300 };
const HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom
const WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
function populateTrends(){

    if (CACHE.has('all_trends')){
        data_render(CACHE.get('all_trends'))
    }
    else{
        $.getJSON("assets/data/all_trends.json", function(data) {
            CACHE.set('all_trends', data)
            data_render(data)
        });
    }
}

function load_weekend_data(){
    if (!CACHE.has('all_week')) {
        $.getJSON("assets/data/all_week.json", function (data) {
            CACHE.set('all_week', data)
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

    CACHE.set('current_trend_data', transformed_data)

    filter_data(transformed_data)
}

function filter_data(data){

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

    const intensity_color = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.delays)])
        .range([1, 5])

    const segments = data.slice(1).map((d, i) => [data[i], d])

    const lines = d3.select('#trends-graph #line-segments')
        .selectAll('line')
        .data(segments)


    function common_line_actions(d3Obj){
        return d3Obj
            .transition()
            .duration(500)
            .attr('x1', d=> x(d[0].label) + x.bandwidth() / 2)
            .attr('y1', d=> y(d[0].delays))
            .attr('x2', d=> x(d[1].label) + x.bandwidth() / 2)
            .attr('y2', d=> y(d[1].delays))
            .attr('stroke', d=> color((d[0].delays + d[1].delays)/2))
            .attr('stroke-width', d=> intensity_color(d[0].delays + d[0].delays))
    }

    lines.join(
        enter => common_line_actions(enter.append('line').style('opacity', 0))
            .transition()
            .duration(600)
            .style('opacity', 1),
        update => common_line_actions(update),
        exit => exit.remove()
    )


    const points = d3.select('#trends-graph #points')
        .selectAll('circle')
        .data(data)

    const radius = d3.scaleLinear()
        .domain([0, max_val])
        .range([3, 7])

    function common_points_actions(d3Obj){
        return d3Obj
            .transition()
            .duration(500)
            .attr('id', d=> d.date)
            .attr('class', 'base')
            .attr('data-delays', d=> d.delays)
            .attr('r', d => radius(d.delays))
            .attr('data-r', d => radius(d.delays))
            .attr('cx', d=>x(d.label) + x.bandwidth() / 2)
            .attr('cy', d=>y(d.delays))
            .attr('stroke-width', d=> intensity_color(max_val - d.delays) + 0.5)
            .attr('stroke', d=> color(d.delays))
    }

    points.join(
        enter => common_points_actions(enter.append('circle').style('opacity', 0))
            .transition()
            .duration(600)
            .style('opacity', 1),
        update => common_points_actions(update),
        exit => exit.remove()
    )
        .on("click", (e) => {
            let point = d3.select(e.target)
            let $week_graph = $('#trends-graph #plot #week_comparison')
            let current_graph = $week_graph.attr('class')

            if (current_graph !== point.attr('id')) {
                if(current_graph === '') $week_graph.fadeIn(500)
                $week_graph.attr('class', point.attr('id'))
                render_comparing(point, current_graph === '')
            } else {
                $week_graph.attr('class', '')
                $week_graph.fadeOut(500)
            }

        })
        .on("mouseenter", (e)=>  {
            let point = d3.select(e.target)
            point.classed('base', !point.classed('base'))
            point.transition()
                .duration(300)
                .attr('fill', color(point.attr('data-delays')))
                .attr('r', point.attr('data-r')*2)
        })
        .on("mouseleave", (e)=>  {
            let point = d3.select(e.target)
            point.classed('base', !point.classed('base'))
            point
                .transition()
                .duration(300)
                .attr('r', point.attr('data-r'))
        })

}

function render_comparing(element, entering){

    let label = element.attr('id')

    let data = CACHE.get('all_week').filter(d=> Object.keys(d)[0] === label)[0][label]

    let {delays_control} = get_trends_controls()

    let delay_idx = delays_control
    if (delay_idx.length === 0) {
        delay_idx = d3.range(5)
    }

    let trans_data = [
        {
            group:'Weekday',
            no_delay: delay_idx.reduce((sum, key) => sum + data.weekday.no_delays[key], 0) / delay_idx.length,
            delay: delay_idx.reduce((sum, key) => sum + data.weekday.delays[key], 0) / delay_idx.length
        },
        {
            group:'Weekend',
            no_delay: delay_idx.reduce((sum, key) => sum + data.weekend.no_delays[key], 0) / delay_idx.length,
            delay: delay_idx.reduce((sum, key) => sum + data.weekend.delays[key], 0) / delay_idx.length
        }
    ]

    let x = element.attr('cx')
    let y = element.attr('cy')
    let width = 180
    let height= 150
    let adj_x = -50
    let adj_y = -60

    const subgroups = ["delay","no_delay"];
    const groups = trans_data.map(d => d.group);

    if(entering){
        d3.select('#trends-graph #plot #week_comparison')
            .attr('transform', `translate(${x}, ${y})`)
            .style('opacity', 0)
            .transition()
            .duration(500)
            .style('opacity', 1)
    }
    else {
        d3.select('#trends-graph #plot #week_comparison')
            .transition()
            .duration(500)
            .attr('transform', `translate(${x}, ${y})`)
    }

    let x_scale = d3.scaleBand()
        .domain(groups)
        .range([0, width])
        .padding([0.2])

    d3.select('#week_comparison #week-x-axis')
        .attr("transform", `translate(${adj_x},${adj_y})`)
        .call(d3.axisBottom(x_scale).tickSizeOuter(0))

    const y_scale = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0])
        .nice()

    d3.select('#week_comparison #week-y-axis')
        .attr("transform", `translate(${adj_x},${adj_y-height})`)
        .call(d3.axisLeft(y_scale).ticks(4))

    const xSubgroup = d3.scaleBand()
        .domain(subgroups)
        .range([0, x_scale.bandwidth()])
        .padding([0.05])

    const color = d3.scaleOrdinal()
        .domain(subgroups)
        .range([d3.schemeCategory10[1], d3.schemeDark2[0]]);


    const format = d3.format(".3s");

    const week_bars = d3.select('#week_comparison #week-bars')
        .attr("transform", `translate(${adj_x},${adj_y-height})`)
        .selectAll('.group_bars').data(trans_data)

    function common_week_actions(d3Obj){

        let barGroups =  d3Obj.attr("transform", d => `translate(${x_scale(d.group)},0)`)
            .attr('class','group_bars')
            .selectAll("g")
            .data(d => subgroups.map(key => {return {key: key, value: d[key]};}))

        function common_bar_actions(barObj) {
             return barObj
                .attr("x", d => xSubgroup(d.key))
                .attr("y", d => y_scale(d.value))
                .attr("width", xSubgroup.bandwidth())
                .attr("height", d => height - y_scale(d.value))
                .attr("fill", d => color(d.key))
        }

        barGroups.join(
            enter=> {
                const subgroup = enter.append('g');

                common_bar_actions(subgroup.append('rect'))
                    .style('opacity', 0)
                    .transition()
                    .duration(1000)
                    .style('opacity', 1)

                subgroup.append('text')
                    .text(d => format(d.value)+'%')
                    .attr('x', d => xSubgroup(d.key) + xSubgroup.bandwidth() / 2)
                    .attr('y', d => y_scale(d.value) - 5)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '10px')
                    .attr('fill', 'black')
                    .style('opacity', 0)
                    .transition()
                    .duration(1000)
                    .style('opacity', 1);

                return subgroup
            },
            update => {

                update.select('rect')
                    .transition()
                    .duration(1000)
                    .call(common_bar_actions)

                update.select('text')
                    .text(d => format(d.value)+'%')
                    .transition()
                    .duration(1000)
                    .attr('x', d => xSubgroup(d.key) + xSubgroup.bandwidth() / 2)
                    .attr('y', d => y_scale(d.value) - 5);

                return update
            }
        )

        return barGroups
    }

    week_bars.join(
        enter => common_week_actions(enter.append('g')),
        update => common_week_actions(update),
    )

    const legendData = [
        { label: "Delay", color: d3.schemeCategory10[1] },
        { label: "No Delay", color: d3.schemeDark2[0] }
    ];

    const legend = d3.select("#week_comparison #legend")
        .attr("transform", `translate(${adj_x+width+10},${adj_y-height})`)

    const legendItem = legend.selectAll(".legend-item")
        .data(legendData)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 30})`);

    legendItem.append("rect")
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", d => d.color);


    legendItem.append("text")
        .attr("x", 30)
        .attr("y", 15)
        .text(d => d.label)
        .attr("font-size", "12px")
        .attr("alignment-baseline", "middle");

}


function render_volume(data) {

    let x = d3.scaleBand()
        .domain(d3.map(data, d => d.label))
        .range([0, WIDTH])

    const height =  200
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .range([height, 0])
        .nice()

    const bars = d3.select('#trends-graph #volume')
        .selectAll('rect').data(data)

    let max_val = Math.max(...data.map(d => d.count))
    let min_val = Math.min(...data.map(d => d.count))
    const color = d3.scaleSequential([0, max_val], d3.interpolateGnBu)

    function common_actions(d3Obj){
        return d3Obj
            .attr("width", x.bandwidth())
            .attr("x", d => x(d.label))
            .attr("y", d => y(d.count) + HEIGHT - height)
            .attr("height", d => height - y(d.count))
            .attr('fill', d => color(d.count))
    }

    bars.join(
        enter => common_actions(enter.append('rect'))
            .style('opacity', 0)
            .transition()
            .duration(1000)
            .style('opacity', 0.7),
        update => common_actions(update.transition().duration(1000))
            .style('opacity', 0.7),
        exit => exit.transition()
            .duration(1000)
            .style('opacity', 0)
            .remove()
    )

    let labels = []
    let limits = Math.round((max_val - min_val)/ 4)
    if(limits > 0){
        labels = d3.range(min_val, max_val, limits)
    }
    else {
        labels = d3.range(min_val, max_val, 0.2)
    }


    labels = [0, ...labels]

    let map_svg_legend = d3.select('#trends-graph #legend')

    map_svg_legend.selectAll('#trends-graph #legend rect').remove()
    map_svg_legend.selectAll('#trends-graph #legend text').remove()

    map_svg_legend
        .attr('transform', `translate(${WIDTH},${-150})`)


    const legend_start_x = 5
    const x_size = 30
    // const x_gap = count ? 5 : 10

    map_svg_legend.selectAll("rect")
        .data(labels)
        .enter()
        .append("rect")
        .attr("x", (d, i) => legend_start_x + i * x_size)
        .attr("y", 10)
        .attr("width", x_size)
        .attr("height", x_size)
        .attr("fill", (d,i) => {
            if(i > 0) return color(d)
            else return '#faf0e6'
        })

    const legend_desc = 'Delays (count)'

    labels.push(legend_desc)

    map_svg_legend.selectAll("text")
        .data(labels)
        .enter()
        .append("text")
        .attr("x", (d, i) => {
            if(labels[i] === legend_desc) return legend_start_x + i * x_size + 10
            else if (i === 0) return legend_start_x + x_size - 5
            return legend_start_x + i * x_size + x_size / 1.5
        })
        .attr("y", (d, i) => {
            if(labels[i] === legend_desc) return x_size - 5
            return 10 + x_size + 10
        })
        .text(d => {
            if(parseInt(d)){
                if(d > 200) return (d/1000).toFixed(2)+'M'
                return d.toFixed(0)+'K'
            }
            else if(parseFloat(d)){
                return d.toFixed(2)+'K'
            }
            else return d
        })
        .attr("font-size", (d,i)=>{
            if(labels[i] === legend_desc) return "9px"
            return "8px"
        })
        .attr("alignment-baseline", "middle")

}
function trend_render(data){

    d3.select('#trends-graph #y_label')
        .attr("y", - MARGIN.left - 40)
        .attr("x", - (CHART_HEIGHT / 2))

    render_line(data)

    render_volume(data)

}

$(document).ready(function(){

    populateTrends()

    load_weekend_data()

    $('#trends-graph #plot #week_comparison').hide(0)

    $("#trends-controls .form-check-input").on('change', function (){
        setTimeout(function (){populateTrends()}, 50)
    })

})