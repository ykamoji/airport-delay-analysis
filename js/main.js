// Map loading script
$(document).ready(function () {

    new Vue({
        el: '#app1',
        vuetify: new Vuetify(),
        data: () => ({
            date: null,
            modal: false
        }),
        methods :{
            onDateSelected(){
                this.$refs.dialog.save(this.date)
                populateMap()

            },
            onDateCleared(){
                this.$refs.dialog.save(null)
                populateMap()
            }
        }
    })

    new Vue({
        el: '#app2',
        vuetify: new Vuetify(),
        data: () => ({
            date: null,
            modal: false
        }),
        methods :{
            onDateSelected(){
                this.$refs.dialog.save(this.date)
                populateMap()

            },
            onDateCleared(){
                this.$refs.dialog.save(null)
                populateMap()
            }
        }
    })

    populateMap()

    const $toggle_svg = $('.toggle-switch svg')
    const $toggle_slider = $('#toggle-slider')


    // TODO:: Fix this
    $('.toggle-switch').click(function(){

        if($(this).children('svg')[0] === $toggle_svg[0]){
            console.log('here')
            return
        }


        let l = 1
        let r = 0
        if($toggle_slider.hasClass('turn')){
            $toggle_slider.removeClass('turn')
        }else{
            $toggle_slider.addClass('turn')
            l = 0
            r = 1
        }

        $($toggle_svg[l]).css('color','rgba(255, 255, 255, 0.5)')
        $($toggle_svg[r]).css('color','white')

        populateMap()
    })

    $('#map-container svg path').each((idx, state) => {

        let state_id = state.classList[0].toUpperCase()

        if (!state_id.includes('-') && state_id.length === 2 && state_id !== 'DE') {

            let bbox = state.getBBox(); // Get bounding box of the state
            let text = document.createElementNS("http://www.w3.org/2000/svg", "text")

            let x = bbox.x + bbox.width / 2
            let y = bbox.y + bbox.height / 2

            if (state_id in CORRECTION_MAP) {
                x += CORRECTION_MAP[state_id]['x']
                y += CORRECTION_MAP[state_id]['y']
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

    $('#searchbox .check-single .form-check-input').change(function () {
        $other_input = $(this).parent().siblings().children('.form-check-input')

        if($other_input.prop('checked'))
            $other_input.prop('checked', false)

    })

});
