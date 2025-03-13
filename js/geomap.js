function get_controls(){

    let controls = {
        "states":[],
        "airlines":[],
        "delays":[],
        "week":null,
        "type":null,
        "dates":{
            "from":0,
            "to":12
        },
        "count":$('#toggle-slider').hasClass('turn')
    }

    let $form = $("#searchbox input")

    for (let i = 0; i < $form.length; i++) {
        let $ele = $($form[i])

        let id = $ele.attr('id')

        if (id.includes('search')){

            let searches = [];
            $ele.parent().next().children().each(function () {
                searches.push($(this).attr('data'))
            });

            if(id.includes('states')){
                controls["states"] = searches
            }
            else if (id.includes('airlines')){
                controls["airlines"] = searches
            }
        }
        else if(id.includes('delay')){
            if($ele.prop('checked')){
                controls['delays'].push(DELAY_DATA_MAPPING[id.split('-')[0]])
            }
        }
        else if(id.includes('week')){
            if($ele.prop('checked')){
                let k = id.split('-')[0]
                controls['week'] = k==='weekday'
            }
        }
        else if(id.includes('date')){
            if($ele.val().length > 0){
                let k = id.split('-')[0]
                let v =  $ele.val()
                controls['dates'][k] = '' + v
            }
        }
        else if(id.includes('type')){
            if($ele.prop('checked')){
                controls['type'] = id.split('-')[0]
            }
        }
    }

    return controls
}


function type_render(type, data){

    if(type === null){
        return [...data['origin'],...data['dest']]
    }
    else if (type === 'origin'){
        return data['origin']
    }
    else if (type === 'dest'){
        return data['dest']
    }

    return []
}


function date_render(dates, data){

    if(dates['from'] === null || dates['to'] === null){
        return data
    }

    let worklist = null
    let from_year = parseInt(dates['from'].split('-')[0])
    let to_year = parseInt(dates['to'].split('-')[0])

    let from_month = parseInt(dates['from'].split('-')[1])
    let to_month = parseInt(dates['to'].split('-')[1])

    worklist = data.filter(d => {
        return parseInt(d['0'].split('-')[0]) >= from_year && parseInt(d['0'].split('-')[1]) >= from_month
    }).filter(d => {
        return parseInt(d['0'].split('-')[0]) <= to_year &&  parseInt(d['0'].split('-')[1]) <= to_month
    })

    return worklist
}


function states_render(states, data){

    let worklist = []

    if(states.length > 0){

        for (let i = 0; i < states.length; i++) {
            worklist.push(data.filter(v => v['1'].toLowerCase() === states[i].toLowerCase()))
        }

        return worklist.flat()

    }

    return data

}


function airlines_render(airlines, data){

    let worklist = []

    if(airlines.length > 0){

        for (let i = 0; i < airlines.length; i++) {
            worklist.push(data.filter(v => v['3'].toLowerCase() === airlines[i].toLowerCase()))
        }

        return worklist.flat()

    }

    return data
}


function week_render(week, data){

    let worklist = []

    if(week === null){
        return data
    }
    else{
        worklist = data.filter(v => v['4'] === week)
        return worklist
    }

}


function delay_render(delays, count, data){

    let delay_population = new Map()

    Object.values(STATES).forEach(st => delay_population.set(st.trim(),0))

    if(delays.length === 0){
        delays = ['5','6','7','8','9']
    }

    for (let i = 0; i < data.length; i++) {

        let row = data[i]
        let total = 0
        for (let j = 0; j < delays.length; j++) {
            let delay = parseInt(row['' + delays[j]])
            total += count ? ( delay > 0 ? 1 : 0) : delay
        }

        let k = row['1'].toLowerCase().trim()
        if(delay_population.has(k))
            delay_population.set(k, delay_population.get(k) + total)
    }

    delay_population.forEach((v, k, m) => {
        if(v > 0) m.set(k, count ? v : Math.round(v/60))
        else m.delete(k)
    })

    return delay_population

}


function populateMap(){

    if (CACHE.has('all_summerized')){
        data_render(CACHE.get('all_summerized'))
    }

    $.getJSON("assets/all_summerized.json", function(data) {
        data_render(data)
        CACHE.set('all_summerized', data)
    });
}


function UI_render(count, delay_population){

    let max_val = Math.max(...delay_population.values())
    let min_val = Math.min(...delay_population.values())
    let num_limit = [...delay_population.values()].reduce((count, v) => count + (v > 0 ? 1 : 0), 0);

    let labels = []
    if(num_limit > 8){
        num_limit = 8
        labels = d3.range(min_val, max_val, Math.round((max_val - min_val)/ num_limit))
    }
    else{
        labels = [...delay_population.values()].sort((a,b) => a-b)
        // console.log(labels)
    }

    const color = d3.scaleSequential([min_val, max_val],d3.interpolateOranges)

    let map_svg = d3.select('#map-container svg g.legend')

    map_svg.selectAll('#map-container svg .legend rect').remove()
    map_svg.selectAll('#map-container svg .legend text').remove()

    // console.log(labels)

    const legend_start_x = 550
    const x_size = 25.1
    // const x_gap = count ? 5 : 10

    map_svg.selectAll("rect")
        .data(labels)
        .enter()
        .append("rect")
        .attr("x", (d, i) => legend_start_x + i * x_size)
        .attr("y", 10)
        .attr("width", 25)
        .attr("height", 25)
        .attr("fill", d => color(d))

    const legend_desc = count ? 'Delays (count)': 'Delays (in hrs)'

    labels.push(legend_desc)

    map_svg.selectAll("text")
        .data(labels)
        .enter()
        .append("text")
        .attr("x", (d, i) => {
            if(labels[i] === legend_desc) return legend_start_x + i * x_size + 10
            return legend_start_x + i * x_size + x_size / 1.5
        })
        .attr("y", (d, i) => {
            if(labels[i] === legend_desc) return 25
            return 10 + 25 + 10
        })
        .text(d => {
            if(parseInt(d)){
                if(d > 500000) return (d/1000000).toFixed(1)+'M'
                return Math.round(d/1000)+'K'
            }
            else return d
        })
        .attr("font-size", (d,i)=>{
            if(labels[i] === legend_desc) return "8px"
            return "7px"
        })
        .attr("alignment-baseline", "middle")


    $('#map-container svg path').each((idx, st)=> {
        // $(st).css("fill", null)
        let id = $(st).attr('class')
        let $text = $('#text-' + id)

        if(id.length === 2){
            if(delay_population.get(id) === 0 || !delay_population.has(id)) {
                $(st).css("opacity", 0.1)
                $('#text-' + id).css("opacity", 0)
            }
            else {
                $(st).css("fill", color(delay_population.get(id)))
                $(st).css("opacity", 1)

                let x = $text.attr('x')
                let y = parseFloat($text.attr('y')) + 8
                let v = delay_population.get(id)
                if(v > 500000)
                    v = (v/1000000).toFixed(1)+'M'
                else
                    v =  Math.round( v/ 1000)+'K'

                $html = '<tspan>'+ id.toUpperCase() +'</tspan>'+
                    '<tspan x="'+ x +'" y="'+ y +'">'+ v +'</tspan>'

                RESET_COORDINATE_MAP.set(id, y)

                $text.html($html)
                    .css("opacity", 1)
            }
        }
    })
}


function data_render(data){

    let {states, airlines, delays, week, type, dates, count} = get_controls()

    let data_list = type_render(type, data)

    data_list = date_render(dates, data_list)

    data_list = states_render(states, data_list)

    data_list = airlines_render(airlines, data_list)

    data_list = week_render(week, data_list)

    let delay_population = delay_render(delays, count, data_list)

    console.log("Type:",type, "\nDates:",dates, "\nStates:", states, "\nAirlines:",airlines,
        "\nDelays:",delays, "\nWeek:",week, "\nCount:", count, "\nResults", data_list.length)

    // console.log(delay_population)

    UI_render(count, delay_population)
}


function populateState(id){
    console.log('populate state airports for ', id)

    $('#map-container svg g.state text').removeClass('zoomed')
    $('#map-container svg g.state #text-'+id).addClass('zoomed')
}


$(document).ready(function () {


    const svg = d3.select("#map-container svg")

    const g = svg.select("g.state");

    const zoom = d3.zoom()
        .scaleExtent([1, 5])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });


    // svg.call(zoom)

    $('#map-container svg g.state path')
        .on("click", function(event){

            let id = $(this).attr('class')

            if(id.includes('-')){
                return
            }

            // console.log(this)

            if($(this).hasClass('zoomed')){
                reset()
                return
            }

            $('#map-container svg g.state path').removeClass('zoomed')

            event.stopPropagation();

            $('#map-container svg g.legend').css('opacity',0)

            const bbox = this.getBBox();

            let scale = 5;
            if(SCALE_MAP[id]) scale = SCALE_MAP[id]

            const width = bbox.width * scale;
            const height = bbox.height * scale;
            const x = bbox.x + bbox.width / 2;
            const y = bbox.y + bbox.height / 2;

            const transform = d3.zoomIdentity
                .translate(550 - x * scale, 300 - y * scale)
                .scale(scale);

            svg.transition()
                .duration(800)
                .call(zoom.transform, transform);

            $('#map-container svg').addClass('zooming')


            $('#map-container svg g.state g.borders path').each((idx, ele)=>{
                let border_id = $(ele).attr('class')

                if(border_id.includes(id)){
                    $(ele).addClass('zoomed')
                }
            })

            $(this).addClass('zoomed')


            setTimeout(function() {
                $('#map-container svg g.state text tspan:nth-of-type(2)').each((idx, html) => {
                    let inner_id = $(html).parent().attr('id').split('-')[1]
                    let time_to_hide = 0
                    if(id === inner_id) {
                        time_to_hide = 600
                    }
                    setTimeout(function() {
                        $(html).attr('y', RESET_COORDINATE_MAP.get(inner_id) - 5)
                        $(html).parent().css('font-size', '2px')
                    }, time_to_hide)
                })
                populateState(id)
            }, 300)


    })
        .on('mouseenter', function (event){

            if($(svg).hasClass('zooming')){
                return
            }

            let id = $(this).attr('class')

            if(id.includes('-')){
                return
            }

            event.stopPropagation();

            $('#map-container svg .state .borders path').removeClass('hovered')

            $('#map-container svg g.state g.borders path').each((idx, ele)=>{
                let border_id = $(ele).attr('class')

                if(border_id.includes(id)){
                    $(ele).addClass('hovered')
                }
            })

            $('#map-container svg').addClass('hovered')

    })
        .on('mouseleave', function (){
            if($(svg).hasClass('zooming')){
                return
            }
            $('#map-container svg').removeClass('hovered')
    })

    function reset(){
        svg.transition()
            .duration(500)
            .call(zoom.transform, d3.zoomIdentity);
        $('#map-container svg g.legend').css('opacity',1)
        $('#map-container svg').removeClass('zooming')
        $('#map-container svg .state path').removeClass('zoomed')
        $('#map-container svg g.state text')
            .removeClass('zoomed')
            .addClass('not-zoomed')

        setTimeout(function() {
            $('#map-container svg g.state text tspan:nth-of-type(2)').each((idx, html) => {
                let id = $(html).parent().attr('id').split('-')[1]
                let reset_value = RESET_COORDINATE_MAP.get(id)
                $(html).attr('y', reset_value).parent().css('font-size','7px')
            })
            $('#map-container svg g.state text').removeClass('not-zoomed')
        }, 300)
    }
})