// Map loading script
$(document).ready(function () {

    populateMap()

    let correctionMap = {
        'LA': { 'x': -20, 'y': 0 },
        'MA': { 'x': 10, 'y': -4 },
        'RI': { 'x': 0, 'y': 1 },
        'VA': { 'x': 20, 'y': 0},
        'MD': { 'x': 15, 'y': -4},
        'FL': { 'x': 45, 'y': 0},
        'ID': { 'x': -10, 'y': 0},
        'NJ': { 'x': 5, 'y': 0},
        'DE': { 'x': 2, 'y': 8},
        'MN': { 'x': -20, 'y': 0},
        'KY': { 'x': 0, 'y': 10},
        'MI': { 'x': 25, 'y': 30},
        'TX': { 'x': 25, 'y': 0},
        'WV': { 'x': -10, 'y': 5},
        'NH': { 'x': -3, 'y': 10},
        'CA': { 'x': -15, 'y': 0},
    }

    $('#map-container svg path').each((idx, state) => {

        let state_id = state.classList[0].toUpperCase()

        if (!state_id.includes('-') && state_id.length === 2 && state_id !== 'DE') {

            let bbox = state.getBBox(); // Get bounding box of the state
            let text = document.createElementNS("http://www.w3.org/2000/svg", "text")

            let x = bbox.x + bbox.width / 2
            let y = bbox.y + bbox.height / 2

            if (state_id in correctionMap) {
                x += correctionMap[state_id]['x']
                y += correctionMap[state_id]['y']
            }

            text.setAttribute("x", x)
            text.setAttribute("y", y)
            text.setAttribute("text-anchor", "middle")
            text.setAttribute("font-size", "7px")
            text.setAttribute("font-weight", "bolder")
            text.setAttribute("fill", "black")
            text.setAttribute("id", "text-"+state_id.toLowerCase())
            text.textContent = state_id
            // console.log(state_id)
            $('#map-container svg .state').append(text)
        }
    });


    let selectedItems = {
        "states": [],
        "airlines":[]
    };

    function showSuggestions(value, id, $suggestion) {
        let search_list = []

        if(id === "states"){
            search_list = Object.keys(STATES)
        }
        else if(id === "airlines"){
            search_list = AIRLINES
        }

        search_list = search_list.filter(item => !selectedItems[id].find(selected => selected===item))

        let filtered = search_list.filter(v => v.toLowerCase().includes(value.toLowerCase()));

        if (filtered.length > 0) {
            let suggestionHTML = filtered.map(v => `<div class="dropdown-item text-wrap">${v}</div>`).join("");
            $suggestion.html(suggestionHTML).addClass("show");
        } else {
            $suggestion.removeClass("show");
        }
    }


    $(".search").on("input", function () {
        let value = $(this).val();
        let id = $(this).attr('id').split('-')[0]
        if (value.length > 0) {
            showSuggestions(value, id, $(this).next().next());
        } else {
            $(this).next().next().removeClass("show");
        }
    });


    $(".suggestions").on("click", ".dropdown-item", function () {
        let selectedText = $(this).text();

        $input = $(this).parent().prev().prev()

        let id = $input.attr('id').split('-')[0]

        if (!selectedItems[id].includes(selectedText)) {
            selectedItems[id].push(selectedText);
            updateSelectedItems($(this).parent().parent().next(), id);
        }

        $input.val("");
        $(this).removeClass("show");
    });

    function updateSelectedItems($selectedContainer, id) {

        $selectedContainer.html(selectedItems[id].map(item => {

            let data_ele = null
            if(id === "states"){
                data_ele = 'data='+'"'+ STATES[item]+'"'
            }
            else{
                data_ele = 'data='+'"'+ item+'"'
            }

            return `<span class="badge bg-primary text-wrap" ${data_ele}>${item} 
                        <span class="remove" data-item="${item}">&times;</span>
                    </span>`
        }).join(""));
        populateMap()
    }

    $(".selected-items").on("click", ".remove", function () {
        let itemToRemove = $(this).data("item");

        let $selectedContainer = $(this).parent().parent()
        let id = $selectedContainer.prev().children('.search').attr('id').split('-')[0]
        selectedItems[id] = selectedItems[id].filter(item => item !== itemToRemove);
        updateSelectedItems($selectedContainer, id);
    });

    $('#searchbox .form-check-input').on("change", function (){
        populateMap()
    });


    $(document).click(function (e) {
        if (!$(e.target).closest(".position-relative").length) {
            $(".suggestions").removeClass("show");
        }
    });

    $("#searchbox input").focusin(function (){
        $(this).next().children('.progress-bar').addClass("focused")
    }).focusout(function (){
        $(this).next().children('.progress-bar').removeClass("focused")
    })


});
