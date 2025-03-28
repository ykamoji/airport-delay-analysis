function populateStateDelays(id){

    if (CACHE.has('all_states')){
        state_map_render(CACHE.get('all_states'), id)
    }
    else{
        $.getJSON("assets/all_state_data.json", function(data) {
            CACHE.set('all_states', data)
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

function transformRadius(x, inMin, inMax, outMin, outMax) {
    return (x - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

function createSegmentedPieChart(data, colors, minVal, maxVal) {
    let svg = $('#state-nightingale-chart');
    let centerX = 200, centerY = 200;
    let numSegments = data.length;
    let totalAngle = Math.PI * 2;
    let anglePerSegment = totalAngle / numSegments;

    data.forEach((value, index) => {
        let startAngle = index * anglePerSegment;
        let radius = transformRadius(value, minVal, maxVal, 100, 200)

        console.log(index, radius)

        let x1 = centerX + radius * Math.cos(startAngle);
        let y1 = centerY + radius * Math.sin(startAngle);
        let x2 = centerX + radius * Math.cos(startAngle + anglePerSegment);
        let y2 = centerY + radius * Math.sin(startAngle + anglePerSegment);

        let pathData = `M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z`;

        let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        path.setAttribute("fill", colors(value));
        path.setAttribute("stroke", "whitesmoke");
        path.setAttribute("stroke-width", "3");
        svg.prepend(path);
    });
}

function state_map_render(data, id){

    let filtered_data = state_data_search(data, id)

    // console.log(filtered_data)

    $($('.nav-link')[1]).click()

    let dataValues = filtered_data.map(d => d['8'])
    let minVal = Math.min(...dataValues)
    let maxVal = Math.max(...dataValues)

    // TODO:: Find condition to manipulate colors
    if(true){
        minVal -= 5000
        maxVal += 1000
    }

    let colorPalette = d3.scaleSequential([minVal, maxVal], d3.interpolateReds)

    createSegmentedPieChart(dataValues, colorPalette, minVal, maxVal);
}