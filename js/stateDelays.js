
function populateStateDelays(){

    if (CACHE.has('all_states')){
        state_map_render(CACHE.get('all_states'))
    }
    else{
        $.getJSON("assets/all_state_data.json", function(data) {
            CACHE.set('all_states', data)
            state_map_render(data)
        });
    }
}

function state_map_render(data){
console.log(data)
}