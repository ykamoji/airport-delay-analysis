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
        }
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
                let v =  parseInt($ele.val().split('-')[1])
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

    let worklist = null
    let from = parseInt(dates['from'])
    let to = parseInt(dates['to'])

    if(from === null || to === null){
        return data
    }

    worklist = data.filter(d => parseInt(d['0']) >= from).filter(d => parseInt(d['0']) <= to)

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


function populateMap(){

    let {states, airlines, delays, week, type, dates} = get_controls()

    $.getJSON("assets/all_summerized.json", function(data) {
        render(data)
    });


    function render(data){

        let data_list = type_render(type, data)

        data_list = date_render(dates, data_list)

        data_list = states_render(states, data_list)

        data_list = airlines_render(airlines, data_list)

        data_list = week_render(week, data_list)

        console.log("Type:",type, "\nDates:",dates, "\nStates:", states, "\nAirlines:",airlines,
            "\nDelays:",delays, "\nWeek:",week, "\nResults", data_list.length)

    }

}

