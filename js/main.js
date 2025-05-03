// Map loading script
$(document).ready(function () {

    new Vue({
        el: '#app1',
        vuetify: new Vuetify(),
        data: () => ({
            date: '2023-01',
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
            date: '2024-12',
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

    let $map_container =  $('#map-container')
    let $airport = $('#map-container .airport-base')
    for (let i = 0; i < 5; i++) {
        $map_container.append($airport.clone())
    }


    const $toggle_switch = $('.toggle-switch')
    const $toggle_svg = $('.toggle-switch svg')
    const $toggle_btn = $('#geo_controls .toggle-btn')
    const $toggle_slider = $('#toggle-slider')

    $toggle_btn.click(function (){
        if($(this).hasClass('turn')){
        }
        else{
            $toggle_btn.removeClass('turn')
            $(this).addClass('turn')
            if($toggle_btn[0] === this){
                $($toggle_switch[0]).click()
            }else{
                $($toggle_switch[1]).click()
            }
        }
    })

    $toggle_switch.click(function(e){
        e.preventDefault()
        if($(this).hasClass('turn')){
            return
        }
        let l = 1
        let r = 0
        if($toggle_slider.hasClass('turn')){
            $toggle_slider.removeClass('turn')
            $($toggle_switch[1]).removeClass('turn')
            $($toggle_switch[0]).addClass('turn')
            $($toggle_btn[0]).click()
        }else{
            $toggle_slider.addClass('turn')
            $($toggle_switch[0]).removeClass('turn')
            $($toggle_switch[1]).addClass('turn')
            $($toggle_btn[1]).click()
            l = 0
            r = 1
        }

        $($toggle_svg[l]).css('color','rgba(255, 255, 255, 0.5)')
        $($toggle_svg[r]).css('color','white')

        populateMap()

        if($('#map-container svg').hasClass('zooming')){
            let id = $('#map-container svg g.state path.zoomed')
                .filter((i,element) => !element.classList[0].includes('-'))
                .map((i, element) => element.classList[0])[0]
            populateStateDelays(id)
        }
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

            text.setAttribute("x", x+'')
            text.setAttribute("y", y+'')
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


    $("#geo_controls .search").on("input", function () {
        let value = $(this).val();
        let id = $(this).attr('id').split('-')[0]
        if (value.length > 0) {
            showSuggestions(value, id, $(this).next().next());
        } else {
            $(this).next().next().removeClass("show");
        }
    });


    $("#geo_controls .suggestions").on("click", ".dropdown-item", function () {

        let selectedText = $(this).text();

        let $input = $(this).parent().prev().prev()

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
        populateDefaultStateDelays(selectedItems['states'].map(st => STATES[st]))
    }

    $(document).click(function (e) {
        if (!$(e.target).closest(".position-relative").length) {
            $("#searchbox #geo_controls .suggestions").removeClass("show");
        }
    });

    $("#geo_controls .selected-items").on("click", ".remove", function () {
        let itemToRemove = $(this).data("item");

        let $selectedContainer = $(this).parent().parent()
        let id = $selectedContainer.prev().children('.search').attr('id').split('-')[0]
        selectedItems[id] = selectedItems[id].filter(item => item !== itemToRemove);
        updateSelectedItems($selectedContainer, id);
    });

    $('#searchbox #geo_controls .form-check-input').on("change", function (){
        setTimeout(function (){populateMap()}, 50)
    });


    $("#searchbox input").focusin(function (){
        $(this).next().children('.progress-bar').addClass("focused")
    }).focusout(function (){
        $(this).next().children('.progress-bar').removeClass("focused")
    })

    $('.check-single .form-check-input').change(function () {
        let $other_input = $(this).parent().siblings().children('.form-check-input')

        if($other_input.prop('checked'))
            $other_input.prop('checked', false)

    })

    function set_slider_width(ele){
        $('#slider').css({
            'width':ele.offsetWidth + 'px',
            'left': ele.offsetLeft +'px'
        })
    }

    $('.nav-link.active.slide').each((active, ele) => set_slider_width(ele))

    $('.nav-link.slide').click(function (e){
        e.preventDefault()
        $('.nav-link').removeClass('active')
        $(this).addClass('active')
        set_slider_width(this)

        let $target = $($(this).attr('href'))[0]

        window.scrollTo({
            top: $target.offsetTop - $('.navbar').height() - 30,
            behavior: 'smooth'
        });

    })

    $("#searchbox").hide(0)
    $('#controls-btn').click(function(){

        $('#caret').toggleClass('caret-rotate')

        let translated_y = $("#searchbox").css('display') === 'none' ? 200 : -200; //

        $('#map-container svg #placeholder circle').each((c, circle) => {
            let x = $('.airport-base .airport')[c].getBoundingClientRect().left
            let y = $('.airport-base .airport')[c].getBoundingClientRect().top
            set_airport_location(x, y + translated_y, circle, c, null, null)
        })
        $("#searchbox").slideToggle(500, "linear")

        setTimeout(function (){
            initializeSlider()
        }, 200)

        let current = parseInt($('#state_legend').css('top').split('px')[0])
        $('#state_legend').css({
            'top':  current + translated_y + 'px'
        })

    })

});
