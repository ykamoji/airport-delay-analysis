const RANGE = {min:100, max: 150}
const MIN_DELAY = 5
const EXTEND_RADIUS = 240
const centerX = 240, centerY = 200;
let INIT = null

function populateStateDelays(id){

    if (CACHE.has('all_states')){
        state_map_render(CACHE.get('all_states'), id)
    }
    else{
        $.getJSON("assets/all_state_data.json", function(data) {
            CACHE.set('all_states', data)
            CACHE.set('airport_details', new Map())
            state_map_render(data, id)
        });
    }
}

function get_state_controls(){

    let controls = {
        'time_slots': null,
        'type': null,
        "is_count": $('#toggle-slider').hasClass('turn'),
        'num_airports': null,
        'airports': []
    }

    let checked_input = $('#state_control .check-single .form-check-input:checked')
    if(checked_input.length === 1){
        controls['type'] = checked_input.attr('id').split('-')[1]
    }

    let selected_time_slots =  $('#state_control #time_slots .btn.active')

    if(selected_time_slots.length > 0){
        controls['time_slots'] = []
        selected_time_slots.each((i, element) => {
            controls['time_slots'].push(parseInt($(element).attr('data-id')))
        })
    }

    let airport_names =[]
    $('#state_control .suggestions .dropdown-item.selected')
        .each((i, element) => airport_names.push(element.innerText))

    controls['airports'] = airport_names

    let num_val = $('#selected_num_airports span').html()
    controls['num_airports'] = parseInt(num_val ? num_val: 5)

    return controls
}

function time_slot_render(time_slot, data){

    if(time_slot === null){
        return data
    }
    else{
        return data.filter(v => time_slot.includes(v['2']))
    }
}

function calc_total_delay(row){
    return ['3', '4', '5', '6', '7'].reduce((sum, key) => sum + row[key], 0);
}


function airports_squeeze(is_count, data){

    let worklist = []

    let airports = new Set(data.map(item => item['1']))

    airports.forEach(air => {
        let li = []
        li['1'] = air;
        ['3', '4', '5', '6', '7', '8'].forEach(idx => li[idx] = 0)
        worklist.push(li)
    })

    data.forEach(d => {
        let airport = worklist.find(w => w['1'] === d['1']);
        ['3', '4', '5', '6', '7'].forEach(idx => airport[idx] += is_count ? (d[idx] > 0 ? 1: 0) : d[idx])
    })

    worklist.forEach(v => {
        ['3', '4', '5', '6', '7'].forEach(idx => v[idx] = is_count ? v[idx] : (v[idx] / 1000))
        v['8'] = calc_total_delay(v)
    })

    return worklist.sort((a, b) => b['8'] - a['8']);
}


function airports_render(airports, data){

    let worklist = []

    if(airports.length > 0){

        for (let i = 0; i < airports.length; i++) {
            worklist.push(data.filter(v => v['1'] === airports[i]))
        }

        return worklist.flat()

    }

    return data
}


function state_data_search(data, id){

    let {time_slots,type, is_count, num_airports, airports} = get_state_controls()

    let data_list = type_render(type, data)

    data_list = airports_render(airports, data_list)

    data_list = states_render([id], data_list, '0')

    data_list = time_slot_render(time_slots, data_list)

    data_list = airports_squeeze(is_count, data_list)

    if(num_airports !== null){
        data_list = data_list.slice(0, num_airports)
    }

    // console.log("Type:",type, "\nNum Airports:",num_airports, "\nTime Slots:", time_slots, "\nAirports:", airports.length,
    //     "\nis_count", is_count, "\nResults", data_list.length)
    //
    // console.log(data_list)

    return data_list
}


function state_map_render(data, id){

    let filtered_data = state_data_search(data, id)

    let dataValues = filtered_data.map(d => d['8'])
    let minVal = Math.min(...dataValues)
    let maxVal = Math.max(...dataValues)

    // TODO:: Find condition to manipulate colors
    if(true){
        minVal -= 5000
        maxVal += 1000
    }

    CACHE.get('airport_details').set('data', filtered_data)

    let abbrList = getAirportAbbr(filtered_data)

    let colorPalette = d3.scaleSequential([minVal, maxVal], d3.interpolateReds)

    createSegmentedPieChart(dataValues, abbrList, colorPalette, minVal, maxVal);

    if (INIT === null || INIT !== id) {

        let total = init_airport_list_sorted(id, data)
        // console.log('INIT')

        if (total <= 3) {
            // $('#num_airports')
            //     .attr('max', total)
            //     .val(total)
        }

        INIT = id
    }


}

function transformRadius(x, inMin, inMax) {
    return (x - inMin) * (RANGE.max - RANGE.min) / (inMax - inMin) + RANGE.min;
}

function createPath(radius, startAngle, anglePerSegment) {
    let x1 = centerX + radius * Math.cos(startAngle);
    let y1 = centerY + radius * Math.sin(startAngle);
    let x2 = centerX + radius * Math.cos(startAngle + anglePerSegment);
    let y2 = centerY + radius * Math.sin(startAngle + anglePerSegment);

    return `M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z`;
}

function createSegmentedPieChart(data, abbrList, colors, minVal, maxVal) {

    let numSegments = data.length < 5 ? 5 : data.length ;
    let anglePerSegment = Math.PI * 2 / numSegments;

    CACHE.get('airport_details').set('anglePerSegment', anglePerSegment)

    let $path = $('#state-chart #airport-details path')
    let $text = $('#state-chart #airport-details text')


    data.forEach((value, index) => {
        let startAngle = index * anglePerSegment - (Math.PI / 2);
        let radius = transformRadius(value, minVal, maxVal)
        let pathData = createPath(radius, startAngle, anglePerSegment)

        CACHE.get('airport_details').set(''+index, pathData)

        let path = $path[index];
        path.setAttribute("d", pathData);
        path.setAttribute("id", 'path-'+index)
        path.setAttribute("fill", colors(value));

        const text = $text[index]
        let mid = (startAngle * 2 + anglePerSegment)/2
        let deg = mid * (180 / Math.PI)

        if(deg > 90 && deg < 270){
            radius *= 1.2
            deg -= 180
        }else{
            radius *= 1.05
        }

        let text_x = centerX + radius * Math.cos(mid)
        let text_y = centerY + radius * Math.sin(mid)
        text.setAttribute("transform", `rotate(${deg}, ${text_x}, ${text_y})`)
        text.setAttribute("x", text_x+'')
        text.setAttribute("y", text_y+'')
        text.setAttribute("id", 'text-'+index)
        text.textContent = abbrList[index]['abbrName'];
    });
}


function resetSegmentedAirport(){
    $('#state-chart, #state-chart #airport-details path, #state-chart #airport-details text')
        .removeClass('zoomed')

    $('#state-chart #zoomed-text')
        .text('')
        .css({'opacity':0})

    $('#state-chart #delay-group path').each((index, element) => {
        $(element).attr('d', '')
            .attr("fill", '')
            .attr('data-id','')
    }).css({'opacity': 0})

    $('#state-chart #delay-group text').each((index, element) => {
        $(element).text('', '')
            .attr("x", '')
            .attr('y','')
    }).css({'opacity': 0})

    $('#state_legend')
        .fadeOut(0)
        .toggleClass('d-flex')
}


function getAirportAbbr(data){
    let abbrList = []
    data.forEach(d => {
        let name = d['1'].split(':')[1].trim()
        let abbrName = name
            .replace(/-/g, '')
            .split(' ')
            .filter(s => s.length > 0)
            .map(s => s[0].toUpperCase())
            .join('')
        abbrList.push({abbrName,name})
    })


    return abbrList

}



function populateAirport($pie, index, airport_cache){

    let anglePerSegment = airport_cache.get('anglePerSegment')
    let data = airport_cache.get('data')[index]

    let startAngle = index * anglePerSegment - (Math.PI / 2);
    let radius_t = EXTEND_RADIUS

    $pie.attr('d', createPath(radius_t, startAngle, anglePerSegment))
    let i = 0
    let portions = []
    let radii = [];
    ['3', '4', '5', '6', '7'].forEach(delay_idx => {
        let per = data[delay_idx]/ data['8']
        let ratio =  (radius_t ** 2) * (per)
        let cumulative_r = i > 0 ?  radii[i - 1] : 0
        radii.push(Math.sqrt(ratio + (cumulative_r ** 2)) )
        portions.push((per * 100).toPrecision(2)+'%')
        i += 1

    })

    radii.slice(1,).forEach((v, index)=> {
        if(radii[index] - radii[index-1] < MIN_DELAY){
            radii[index] +=  MIN_DELAY - (radii[index] - radii[index-1])
        }
    })

    setTimeout(function (){

        $('#state-chart #delay-group path')
            .css({'opacity': 0})
            .each((i, element) => {
                let r = radii[radii.length -1 - i]
                $(element).attr('fill', $pie.attr('fill'))
                $(element).attr('d', createPath(r, startAngle, anglePerSegment))
                $(element).attr('data-id', index)
                $(element).attr('data-idx', i)
            }).css({'opacity': 1})

        let deg = startAngle * (180 / Math.PI)
        // console.log(deg)
        let text_x = centerX
        let text_y = centerY
        let x_adj = 10
        let y_adg = -5
        if(deg > 90 && deg < 270){
            deg -= 180
            text_x = centerX + radius_t * Math.cos(startAngle);
            text_y =  centerY + radius_t * Math.sin(startAngle);
            x_adj = 5
            y_adg = 10
        }

        $('#state-chart #delay-group text')
            .css({'opacity': 0})
            .each((i, element) => {
                let theta =  startAngle + anglePerSegment + (Math.PI / 30)
                let r_text = radii[radii.length - 1 - i]
                let t_x = centerX + r_text * Math.cos(theta)
                let t_y = centerY + r_text * Math.sin(theta)
                $(element).attr('x', t_x)
                $(element).attr('y', t_y)
                $(element).attr('data-idx', i)
                $(element).text(portions[portions.length -1 - i])
            })

        $('#zoomed-text')
            .attr("x", text_x+ x_adj)
            .attr('transform', `rotate(${deg}, ${text_x}, ${text_y})`)
            .attr("y", text_y + y_adg)
            .css({'opacity': 1})
            .text(data['1'])

        d3.range(0,5).forEach(idx => {
            let text = $('#state-chart #delay-group text.hovering-'+idx).html()
            $('#state_legend .legend-'+idx+' .legend_val').html('('+ text + ')')
        })
        $('#state_legend')
            .toggleClass('d-flex')
            .fadeIn(100)
    }, 200)

}

$(document).ready(function (){

    airportSelector()

    timeSlotSelector()

    $('#state_legend')
        .toggleClass('d-flex')
        .hide(0)


    $('#state_control .form-check-input').on("change", function (){
        reset_airports()
        setTimeout(function (){
            let id = $('#map-container svg g.state path.zoomed')
                .filter((i,element) => !element.classList[0].includes('-'))
                .map((i, element) => element.classList[0])[0]
            populateStateDelays(id)
        }, 50)
    });

    $('#num_airports').on('input', function (){
        let id = $('#map-container svg g.state path.zoomed')
            .filter((i,element) => !element.classList[0].includes('-'))
            .map((i, element) => element.classList[0])[0]
        reset_airports()
        populateStateDelays(id)
    })


    let $path = $('#state-chart #airport-details path')
    let $text = $('#state-chart #airport-details text')
    let $airport_details = $('#state-chart #airport-details')

    for (let i = 0; i < 15; i++) {
        $airport_details.append($path.clone())
        $airport_details.append($text.clone())
    }

    let $state_chart = $('#state-chart')

    $('#state-chart #airport-details path').on('mouseenter',function (){
        if(!$state_chart.hasClass('zoomed')){
            $state_chart.addClass('hovering')
            $(this).addClass('hovering')
            let index = $(this).attr('id').split('-')[1]
            $('#state-chart #airport-details #text-'+index).attr('font-size', '15px')
        }
    }).on('mouseleave',function (){
        if(!$state_chart.hasClass('zoomed')) {
            $state_chart.removeClass('hovering')
            $('#airport-details path').removeClass('hovering')
            $('#state-chart #airport-details text')
                .attr('font-size', '12px')
        }
    }).on('click', function (){
        $state_chart.removeClass('hovering')
        $('#airport-details path').removeClass('hovering')

        let index = $(this).attr('id').split('-')[1]
        let airport_cache = CACHE.get('airport_details')
        if($state_chart.hasClass('zoomed')){
            $(this).attr('d', airport_cache.get(''+index))
            resetSegmentedAirport()
        }
        else {
            $state_chart.addClass('zoomed')
            $(this).addClass('zoomed')
            populateAirport($(this), index, airport_cache)
        }
    })


    $('#state-chart #delay-group path').on('click', function (){
        let index = $(this).attr('data-id')
        let airport_cache = CACHE.get('airport_details')
        $('#state-chart #airport-details path#path-'+index).attr('d',  airport_cache.get(''+index))
        resetSegmentedAirport()
    }).on('mouseenter', function (){
        let idx = $(this).attr('data-idx')
        $(this).addClass('hovering')
        $('#state-chart #delay-group text').each((i, element) => {
            if($(element).attr('data-idx') === idx){
                $(element).css({'opacity': 1}).addClass('hovering')
            }
        })
    }).on('mouseleave', function (){
        $('#state-chart #delay-group path').removeClass('hovering')
        $('#state-chart #delay-group text').css({'opacity':0}).removeClass('hovering')
    })

})


function get_left($slider, slider_cord, slider_value_cord){
    let current_val = parseInt($slider.val())
    let rel = 0
    let max_val = parseInt($slider.attr('max'))
    if(current_val === 1){
        rel = 0
    }
    else{
        rel = parseInt(slider_cord.width) * current_val /  max_val - 15
        if(max_val < 5)
            rel -= 10

    }
    let left = slider_cord.left - slider_value_cord.left
    return left + rel +'px'
}

function initializeSlider(){

    let $slider = $('#num_airports')
    let $slider_value = $('#selected_num_airports')

    // $slider_value.toggleClass('d-none')

    let slider_cord = $slider[0].getBoundingClientRect()
    let slider_value_cord = $slider_value[0].getBoundingClientRect()

    $slider_value.css({
        'left': get_left($slider, slider_cord, slider_value_cord)
    })

    $slider_value.find('span').html($slider.val())
    $slider.on("input", function (){
        $slider_value.find('span').html($(this).val())
        $slider_value.css({
            'left': get_left($slider, slider_cord, slider_value_cord)
        })
    })
}

function init_airport_list_sorted(id, data){

    let airport_list = [...new Set(type_render(null, data)
        .filter(d => id === d['0'].toLowerCase())
        .map(d => d['1']))]

    let sorted_list = type_render(null, data)
        .filter(d => id === d['0'].toLowerCase())

    sorted_list = sorted_list.reduce((acc, v) => {
        acc[v['1']] = (acc[v['1']] || 0);
        ['3', '4', '5', '6', '7'].forEach(idx => {
            acc[v['1']] += v[idx]
        })
        return acc;
    }, {});

    const sortedAirports = Object.entries(sorted_list)
        .sort(([, a], [, b]) => b - a)  // Sort by total delays descending
        .map(d => d[0]);

    $('#state_control .suggestions').html(sortedAirports.map(v => `<div class="dropdown-item text-wrap">${v}</div>`).join(""))

    return airport_list.length
}

function airportSelector(){

    $('#state_control #airports-search').on('focus', function (){
        if(CACHE.has('airport_details')) $(this).next().next().addClass("show")
    }).on('input', function (){
        if(!CACHE.has('airport_details')) return
        $(this).next().next().addClass("show");
        let value = $(this).val();
        let search_list = CACHE.get('airport_details').get('data').map(d => d['1'])

        if(value.length > 0){
            search_list = search_list.filter(v => v.toLowerCase().includes(value.toLowerCase()))
            if(search_list.length === 0){
                $(this).next().next().removeClass("show");
                return
            }
            $('#state_control .suggestions .dropdown-item').each((i, element)=>{
                if(!search_list.includes(element.innerText)){
                    $(element).hide(0)
                }
            })
        }
        else{
            $('#state_control .suggestions .dropdown-item').show(0)
        }
    })

    $('#state_control .suggestions').on('click',' .dropdown-item',function (){
        if($(this).hasClass('selected') ||
            $('#state_control .suggestions .dropdown-item.selected').length < $('#num_airports').val()){
            $(this).toggleClass('selected')
            reset_airports()
            let id = $('#map-container svg g.state path.zoomed')
                .filter((i,element) => !element.classList[0].includes('-'))
                .map((i, element) => element.classList[0])[0]
            populateStateDelays(id)
        }
    })


    $(document).click((e)=>{
        if(!$('#state_control #airports-search').parent('div')[0].contains(e.target)){
            $("#state_control .suggestions").removeClass("show")
        }
    })
}


function timeSlotSelector(){

    $('#state_control #time_slots .btn').on('click', function (){
        $(this).toggleClass('active')
        reset_airports()
        let id = $('#map-container svg g.state path.zoomed')
            .filter((i,element) => !element.classList[0].includes('-'))
            .map((i, element) => element.classList[0])[0]
        populateStateDelays(id)
    })

}

function reset_airports(){
    let $path = $('#state-chart #airport-details path')
    let $text = $('#state-chart #airport-details text')

    for (let i = 0; i < 15; i++) {
        $($path[i]).attr("d", "")
            .attr("class", "")
            .attr("id", '')
            .attr("fill", '')

        $($text[i]).attr("transform", '')
            .attr("x", '')
            .attr("y", '')
            .attr("id", '')
            .text('')
    }
}