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
        "is_count":$('#toggle-slider').hasClass('turn')
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


function delay_render(delays, is_count, data){

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
            total += is_count ? ( delay > 0 ? 1 : 0) : delay
        }

        let k = row['1'].toLowerCase().trim()
        if(delay_population.has(k))
            delay_population.set(k, delay_population.get(k) + total)
    }

    delay_population.forEach((v, k, m) => {
        if(v > 0) m.set(k, is_count ? v : Math.round(v/60))
        else m.delete(k)
    })

    return delay_population

}


function state_render(delays, is_count, data, id){

    let state_population = new Map()

    let states_data = data.filter(d => d['1'].toLowerCase() === id)

    let airports_in_state = new Set(states_data.map(d => d['2']))

    airports_in_state.forEach(airport => state_population.set(airport, {
        'count': 0,
        'delays': 0,
        '0':0,
        '1':0,
        '2':0,
        '3':0
    }))

    if(delays.length === 0){
        delays = ['5','6','7','8','9']
    }

    states_data.forEach(state => {
        let total = 0
        for (let j = 0; j < delays.length; j++) {
            let delay = parseInt(state['' + delays[j]])
            total += is_count ? (delay > 0 ? 1 : 0) : delay
        }
        let state_data = state_population.get(state['2'])
        state_data['count'] += 1
        state_data['delays'] += total
        state_data['0'] += state['10']
        state_data['1'] += state['11']
        state_data['2'] += state['12']
        state_data['3'] += state['13']
    })

    state_population.forEach((v,k,m) => {
        Object.keys(v).forEach(k => {
            if(k !== 'count' && k !== 'delays')
                v[k]=(v[k]/v['count']).toFixed(3)
            else if(k === 'delays'){
                v[k] = is_count ? v[k] : Math.round(v[k]/60)
            }
        })
        m.set(k, v)
    })

    state_population = [...state_population.entries()]
        .sort((a, b) => b[1]['delays'] - a[1]['delays'])
        .map(([k,v]) => {
            let m = new Map()
            m.set('airport', k)
            Object.keys(v).filter(en_k => en_k !== 'count').forEach(en_k => m.set(en_k, v[en_k]))
            return m

        })

    if(state_population.length > 6){
        state_population = [...state_population.slice(0, 3),...state_population.slice(-3)]
    }
    // console.log(state_population)

    return state_population
}


function populateMap(){

    if (CACHE.has('all_summerized')){
        geo_map_render(CACHE.get('all_summerized'))
    }
    else{
        $.getJSON("assets/all_summerized.json", function(data) {
            CACHE.set('all_summerized', data)
            geo_map_render(data)
        });
    }

}


function geo_map_render(data){

    let delay_population =  data_search(data, 'geo', null)

    // console.log("Type:",type, "\nDates:",dates, "\nStates:", states, "\nAirlines:",airlines,
    //     "\nDelays:",delays, "\nWeek:",week, "\nCount:", count, "\nResults", data_list.length)

    // console.log(delay_population)

    let max_val = Math.max(...delay_population.values())
    let min_val = Math.min(...delay_population.values())
    let num_limit = [...delay_population.values()].reduce((c, v) => c + (v > 0 ? 1 : 0), 0);
    let is_count = $('#toggle-slider').hasClass('turn')

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

    const legend_desc = is_count ? 'Delays (count)': 'Delays (in hrs)'

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
            // console.log(id, AIRPORT_POINTS[id])
            if(delay_population.get(id) === 0 || !delay_population.has(id)) {
                $(st).css("opacity", 0.1)
                $text.css("opacity", 0)
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

    if($('#map-container svg').hasClass('zooming')){
        let id = $('#map-container svg.zooming g.state path.zoomed').attr('class').split(' ')[0]
        populateState(id,'render')
    }
}


function data_search(data, search_type, id){

    let {states, airlines, delays, week, type, dates, is_count} = get_controls()

    let data_list = type_render(type, data)

    data_list = date_render(dates, data_list)

    data_list = states_render(states, data_list)

    data_list = airlines_render(airlines, data_list)

    data_list = week_render(week, data_list)

    if(search_type === 'geo'){
        data_list = delay_render(delays, is_count, data_list)
    }

    if(search_type === 'state'){
        data_list = state_render(delays, is_count, data_list, id)
    }

    // console.log(data_list)

    return data_list
}


function camelCasing(text){

    return text.split(' ').map(word => {
        // console.log(word)
        let txt = '<span style="font-size:55px">'+ word.substring(0,1) +'</span>' + word.substring(1,)
        return txt + '&nbsp;&nbsp;'
    })
}


function airport_ordering(airports){

    airports.forEach((airport, idx) => {
        let a_c = airport.get('airport').split(': ')
        let city = a_c[0].split(',')[0]
        airport.set('city',city)
        airport.set('airport',a_c[1])
        airport.set('rank', idx)
    })


    return airports.sort((a, b) => a.get('airport').localeCompare(b.get('airport')))
}

function populateState(id, step){

    $airports = $('.airport-base')

    $('#map-container svg g.state text').removeClass('zoomed')

    if(step === 'enter'){
        $airports.removeClass('show')
    }

    $('#map-container svg g.state #text-'+id).addClass('zoomed')

    let state_population = data_search(CACHE.get('all_summerized'), 'state', id)

    let airport_coordinates_cache = new Map()
    if(CACHE.has('airport_coordinates')){
        airport_coordinates_cache = CACHE.get('airport_coordinates')
    }

    // console.log(state_population)

    setTimeout(function (){

        let points = AIRPORT_POINTS[id]

        let state_name = Object.entries(STATES).filter(st => st[1] === id)[0][0]
        let header_top = points.reduce((a,b) => a['t'] < b['t'] ? a : b)['t'] - 100

        $('#map-container #map-header')
            .html(camelCasing(state_name.toUpperCase()))
            .fadeIn(0)
            .css({
                'opacity':'1',
                'top': header_top + 'px',
            })


        state_population = airport_ordering(state_population)

        // console.log(state_population)

        let radius = [25, 35, 45, 55, 65, 70].reverse()
        state_population.forEach((airport, c)=> {

            let rank = airport.get('rank')

            $($airports[c]).find('.point').css('--radius', radius[rank] +'px')

            $($airports[c]).find('.rank').text(rank+1)

            let d = $('#toggle-slider').hasClass('turn') ? airport.get('delays') :
                (airport.get('delays') / 1000).toFixed(2)+ 'K hrs '

            $($airports[c]).find('.stats .card-title').html(d)

            $($airports[c]).find('.stats .table tr th:nth-of-type(2)').each((idx, grp) => {
                let val = airport.get(idx+'')
                let cls = 'neg'
                if(val > 0){
                    val = '+'+val
                    cls = 'pos'
                }
                $(grp).text(val).addClass(cls)
            })

            let airport_location = airport.get('airport')+ ', '+airport.get('city')


            if(!airport_coordinates_cache.has(airport_location)){
                if(step === 'enter'){
                    airport_coordinates_cache.set(airport_location, points[c])
                }
                else{
                    let new_point = {'t':0,'l':0}
                    new_point['t'] = points[c]['t'] + (Math.random() > 0.5 ?  Math.random(): -Math.random())*50
                    new_point['l'] = points[c]['l'] + (Math.random() > 0.5 ?  Math.random(): -Math.random())*50
                    airport_coordinates_cache.set(airport_location, new_point)
                }
            }

            let top_val = airport_coordinates_cache.get(airport_location)['t']//points[c]['t']
            let left_val = airport_coordinates_cache.get(airport_location)['l']//points[c]['l']

            $($airports[c])
                .find('.loc')
                .css({
                    "top": top_val - 20  + 'px',
                    "left": left_val - 20 + 'px',
                }).fadeIn(300)

            $($airports[c])
                .find('.name')
                .text(airport_location)
                .css({
                    "top": top_val - 20  + 'px',
                    "left": left_val + 'px',
                }).fadeIn(300)


            $($airports[c])
                .find('.airport')
                .css({
                "top": top_val + 'px',
                "left": left_val + 'px',
            }).fadeIn(300)


            $($airports[c])
                .addClass('show')
                .find('.stats')
                .css({
                "top": top_val + radius[rank] + 5 + 'px',
                "left": left_val - 100 + 'px',
            })

            c += 1
        })

        CACHE.set('airport_coordinates', airport_coordinates_cache)

    }, 200)

}

function reset_state() {
    $('#map-container .airport, #map-container #map-header, .airport-base .loc,.airport-base .loc,.airport-base .name')
        .fadeOut(0)

    let clear_contents = [
        '#map-container .airport-base .name',
        '#map-container .airport-base .rank',
        '#map-container .airport-base .card-title',
        '#map-container .airport-base .stats .table tr th:nth-of-type(2)',
    ]

    clear_contents.forEach(content => $(content).html(''))
}


// D3 Zoom logic
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

            reset_state()

            if($(this).hasClass('zoomed')){
                reset_geo_map()
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

            // console.log(transform.k, transform.x, transform.y)

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
                populateState(id, 'enter')
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


    $('.airport-base').on('mouseenter',function (){
        $('.airport-base .stats, .airport-base .name, .airport-base .loc, .airport-base .airport')
            .css({'z-index':'10'})
        $(this)
            .find('.stats')
            .css({'z-index':'100'})
            .fadeIn(0)

        $(this).find('.name,.loc,.airport').css({'z-index':'100'})

        const $current_hovered = $(this)
        $('.airport-base').each((idx, ele) => {
            if($current_hovered[0] !== $(ele)[0]){
                $(ele).find('.name,.loc')
                    .css({'opacity':'0.3'})
            }
        })
    }).on('mouseleave',function () {
        $base = $('.airport-base')
        $base.find('.airport-base .airport').css({'z-index':'10'})
        $base.find('.stats')
            .css({'z-index':'10'})
            .fadeOut(0)
        $base.find('.name,.loc').css({'opacity':'1','z-index':'10'})
    })

    function reset_geo_map(){

        svg.transition()
            .duration(500)
            .call(zoom.transform, d3.zoomIdentity);
        $('#map-container svg g.legend').css('opacity',1)
        $('#map-container svg').removeClass('zooming')
        $('#map-container svg .state path').removeClass('zoomed')
        $('#map-container svg g.state text')
            .removeClass('zoomed')
            .addClass('not-zoomed')

        $('.airport-base').removeClass('show')

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