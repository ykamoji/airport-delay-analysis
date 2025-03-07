// Map loading script

const states = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
    "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana",
    "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina",
    "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
    "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
    "Wisconsin", "Wyoming"
];


$(document).ready(function () {

    const mapContainer = document.getElementById("map-container")

    let correctionMap = {
        'LA': { 'x': -20, 'y': 0 },
        'VA': { 'x': 20, 'y': 0},
        'MD': { 'x': 5, 'y': -4},
        'FL': { 'x': 45, 'y': 0},
        'ID': { 'x': -10, 'y': 0},
        'NJ': { 'x': 5, 'y': 0},
        'DE': { 'x': 2, 'y': 8},
        'MN': { 'x': -20, 'y': 0},
        'KY': { 'x': 0, 'y': 10},
        'MI': { 'x': 25, 'y': 30},
        'WV': { 'x': -10, 'y': 5},
        'NH': { 'x': -3, 'y': 10},
    }

    mapContainer.addEventListener("load", function () {

        const svgDoc = mapContainer.contentDocument;
        const states = svgDoc.querySelectorAll("path")

        states.forEach(state => {

            let state_id = state.classList[0].toUpperCase()

            if(!state_id.includes('-') && state_id.length === 2) {

                let bbox = state.getBBox(); // Get bounding box of the state
                let text = document.createElementNS("http://www.w3.org/2000/svg", "text")

                let x = bbox.x + bbox.width / 2
                let y = bbox.y + bbox.height / 2

                if(state_id in correctionMap){
                    x += correctionMap[state_id]['x']
                    y += correctionMap[state_id]['y']
                }

                text.setAttribute("x", x)
                text.setAttribute("y", y)
                text.setAttribute("text-anchor", "middle")
                text.setAttribute("font-size", "8px")
                text.setAttribute("fill", "grey")
                text.textContent =  state_id
                console.log(state_id)
                svgDoc.querySelector("svg").appendChild(text)
            }
        });
    });

    const searchInput = $("#state-search");
    const suggestionsBox = $("#suggestions");
    const selectedItemsContainer = $("#selected-items");

    let selectedItems = [];


    function showSuggestions(value) {
        let filtered = states.filter(state => state.toLowerCase().includes(value.toLowerCase()));
        if (filtered.length > 0) {
            let suggestionHTML = filtered.map(state => `<div class="dropdown-item">${state}</div>`).join("");
            suggestionsBox.html(suggestionHTML).addClass("show");
        } else {
            suggestionsBox.removeClass("show");
        }
    }


    searchInput.on("input", function () {
        let value = $(this).val();
        if (value.length > 0) {
            showSuggestions(value);
        } else {
            suggestionsBox.removeClass("show");
        }
    });


    suggestionsBox.on("click", ".dropdown-item", function () {
        searchInput.val($(this).text());
        suggestionsBox.removeClass("show");
    });

    suggestionsBox.on("click", ".dropdown-item", function () {
        let selectedText = $(this).text();

        if (!selectedItems.includes(selectedText)) {
            selectedItems.push(selectedText);
            updateSelectedItems();
        }

        searchInput.val(""); // Clear input for next search
        suggestionsBox.removeClass("show");
    });

    function updateSelectedItems() {
        selectedItemsContainer.html(selectedItems.map(item =>
            `<span class="badge bg-primary">${item} 
                        <span class="remove" data-item="${item}">&times;</span>
                    </span>`
        ).join(""));
    }

    selectedItemsContainer.on("click", ".remove", function () {
        let itemToRemove = $(this).data("item");
        selectedItems = selectedItems.filter(item => item !== itemToRemove);
        updateSelectedItems();
    });


    $(document).click(function (e) {
        if (!$(e.target).closest(".position-relative").length) {
            suggestionsBox.removeClass("show");
        }
    });
});
