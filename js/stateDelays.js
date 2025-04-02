RANGE = {min:100, max: 150}
const centerX = 250, centerY = 250;

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
        'num_airports': 10
    }

    return controls
}

function time_slot_render(time_slot, data){

    let worklist = []

    if(time_slot === null){
        return data
    }
    else{
        return data.filter(v => v['2'] === time_slot)
    }
}

function calc_total_delay(row){
    return ['3', '4', '5', '6', '7'].reduce((sum, key) => sum + row[key], 0);
}


function airports_squeeze(data){

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
        ['3', '4', '5', '6', '7'].forEach(idx => airport[idx] += d[idx])
    })

    worklist.forEach(v => {
        ['3', '4', '5', '6', '7'].forEach(idx => v[idx] = (v[idx] / 1000))
        v['8'] = calc_total_delay(v)
    })

    return worklist.sort((a, b) => b['8'] - a['8']);
}

function state_data_search(data, id){

    let {time_slots,type,num_airports} = get_state_controls()

    let data_list = type_render(type, data)

    data_list = states_render([id], data_list, '0')

    data_list = time_slot_render(time_slots, data_list)

    data_list = airports_squeeze(data_list)

    if(num_airports !== null){
        data_list = data_list.slice(0, num_airports)
    }

    return data_list
}

function state_map_render(data, id){

    let filtered_data = state_data_search(data, id)

    // console.log(filtered_data)

    // $($('.nav-link')[1]).click()

    let dataValues = filtered_data.map(d => d['8'])
    let minVal = Math.min(...dataValues)
    let maxVal = Math.max(...dataValues)

    // TODO:: Find condition to manipulate colors
    if(true){
        minVal -= 5000
        maxVal += 1000
    }

    CACHE.get('airport_details').set('data', filtered_data)
    CACHE.get('airport_details').set('minVal', minVal)
    CACHE.get('airport_details').set('maxVal', maxVal)

    let abbrList = getAirportAbbr(filtered_data)

    let colorPalette = d3.scaleSequential([minVal, maxVal], d3.interpolateReds)

    createSegmentedPieChart(dataValues, abbrList, colorPalette, minVal, maxVal);
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

    let numSegments = data.length;
    let totalAngle = Math.PI * 2;
    let anglePerSegment = totalAngle / numSegments;

    CACHE.get('airport_details').set('anglePerSegment', anglePerSegment)

    let $path = $('#state-chart #airport-details path')
    let $text = $('#state-chart #airport-details text')

    data.forEach((value, index) => {
        let startAngle = index * anglePerSegment;
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


function resetAirport(){
    $('#state-chart, #state-chart #airport-details path, #state-chart #airport-details text')
        .removeClass('zoomed')

    $('#state-chart #zoomed-text')
        .text('')
        .css({'opacity':0})
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

    // console.log(abbrList)

    return abbrList

}

function populateAirport($pie, index, airport_cache){

    let anglePerSegment = airport_cache.get('anglePerSegment')
    let data = airport_cache.get('data')[index]
    let minVal =  airport_cache.get('minVal')
    let maxVal =  airport_cache.get('maxVal')

    let startAngle = index * anglePerSegment;
    let radius = transformRadius(data['8'], minVal, maxVal, RANGE.min, RANGE.max) * 1.5

    $pie.attr('d', createPath(radius, startAngle, anglePerSegment))

    let radii = [];
    ['3', '4', '5', '6', '7'].forEach(delay_idx => {
        // console.log(data[delay_idx])
        radii.push(data[delay_idx]/ data['8'] * radius)
    })

    // TODO: Fix the data gap issue
    //  If the gap is too small, introduce small distortion
    //  Maybe change the order of delays shown according to global sense

    // console.log(radii)

    radii = radii.reduce((acc, curr, index) => {
        if (index === 0) {
            acc.push(curr)
        }else{
            acc.push(curr + acc[index - 1])
        }
        return acc;
    },[])

    // console.log(radii)

    $('#state-chart #delay-group path').each((index, element) => {
        let r = radii[radii.length -1 - index]
        $(element).attr('d', createPath(r, startAngle, anglePerSegment))
        $(element).attr('id', r)
        $(element).attr('fill', $pie.attr('fill'))
    })

    setTimeout(function (){

        let deg = startAngle * (180 / Math.PI)
        // console.log(deg)
        let text_x = centerX
        let text_y = centerY
        let x_adj = 10
        let y_adg = -5
        if(deg > 90 && deg < 270){
            deg -= 180
            text_x = centerX + radius * Math.cos(startAngle);
            text_y =  centerY + radius * Math.sin(startAngle);
            x_adj = 5
            y_adg = 10
        }

        $('#zoomed-text')
            .attr("x", text_x+ x_adj)
            .attr('transform', `rotate(${deg}, ${text_x}, ${text_y})`)
            .attr("y", text_y + y_adg)
            .css({'opacity': 1})
            .text(data['1'])
    }, 400)

}

$(document).ready(function (){

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
        }
    }).on('mouseleave',function (){
        if(!$state_chart.hasClass('zoomed')) {
            $state_chart.removeClass('hovering')
            $('#airport-details path').removeClass('hovering')
        }
    }).on('click', function (){
        $state_chart.removeClass('hovering')
        $('#airport-details path').removeClass('hovering')

        let index = $(this).attr('id').split('-')[1]
        let airport_cache = CACHE.get('airport_details')
        if($state_chart.hasClass('zoomed')){
            $(this).attr('d', airport_cache.get(''+index))
            resetAirport()
        }
        else {
            $state_chart.addClass('zoomed')
            $(this).addClass('zoomed')
            populateAirport($(this), index, airport_cache)
        }
    })
})