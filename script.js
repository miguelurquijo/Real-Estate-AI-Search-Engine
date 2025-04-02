document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded and parsed");

    const searchButton = document.getElementById("search-button");
    const searchBar = document.getElementById("search-bar");
    const propertyCardsContainer = document.getElementById("property-cards-container");
    const summaryResponseContainer = document.getElementById("summary-response");

    searchButton.addEventListener("click", handleSearch);

    // Fetch and display property cards on page load
    fetchPropertyCards();

    // Function to handle search button click
    function handleSearch() {
        const searchQuery = getSearchQuery();
        if (searchQuery) {
            console.log("Search query:", searchQuery);
            summarizeInput(searchQuery);
            clearSearchBar();
        } else {
            console.log("No search query provided");
        }
    }

    // Function to get the search query value
    function getSearchQuery() {
        return searchBar.value.trim();
    }

    // Function to clear the search bar
    function clearSearchBar() {
        searchBar.value = "";
    }

    // Fetch property cards from the API
    async function fetchPropertyCards() {
        console.log("Fetching property listings..."); // Debugging log
        try {
            const response = await fetch(
                "https://microservices.lahaus.com/ims/api/pcp/v2/listing/residential-complex/filter",
                {
                    method: "POST",
                    headers: {
                        "x-api-key": "9a85a5e8-bfe3-4b69-9f50-5104e8ab29b9",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        show_all: true,
                        fields: [
                            "name",
                            "code",
                            "location.neighborhood",
                            "location.zone",
                            "ims.min_price",
                            "ims.delivered_at",
                            "attributes.cover",
                        ],
                        filters: {
                            and: [
                                { "location.business_hub": "Ciudad de México" },
                                { "ims.is_completed": "true" },
                                { status: "active" },
                            ],
                        },
                        sort: {
                            key: "rank_score",
                            order: "desc",
                        },
                        pagination: {
                            limit: 200,
                            offset: 0,
                        },
                    }),
                }
            );
            const data = await response.json();
            displayPropertyCards(data);
        } catch (error) {
            console.error("Error fetching property listings:", error);
        }
    }

    // Function to display property cards
    function displayPropertyCards(data) {
        console.log("Displaying property listings..."); // Debugging log
        console.log("-----------------------------------");
        propertyCardsContainer.innerHTML = ""; // Clear existing content
        const listings = data.rows;
        if (Array.isArray(listings)) {
            listings.forEach((listing) => {
                const card = createPropertyCard(listing);
                propertyCardsContainer.appendChild(card);
            });
        } else {
            console.error("Unexpected data format:", data);
        }
    }

    // Function to create a property card element for API data
    function createPropertyCard(listing) {
        // Format the date
        let deliverAtFormatted = formatDeliveryDate(listing.ims?.delivered_at);

        // Format the price as MXN currency
        let minPriceFormatted = listing.ims?.min_price
            ? new Intl.NumberFormat("es-MX", {
                style: "currency",
                currency: "MXN",
                minimumFractionDigits: 0,
            }).format(listing.ims.min_price)
            : "Price Not Available";
        const card = document.createElement("div");
        card.classList.add("card");
        card.innerHTML = `
            <div class="card-image">
                <img src="${listing.attributes?.cover || "https://via.placeholder.com/312"
            }" alt="Image of ${listing.name}">
                <div class="image-chip">
                    <p>${deliverAtFormatted}</p>
                </div>
            </div>
            <div class="card-details">
                <div class="price-info">
                    <h2 class="street">${listing.name || "No Name"}</h2>
                    <h3 class="address">${listing.location?.neighborhood || "Unknown Neighborhood"
            }, ${listing.location?.zone || "Unknown Zone"}</h3>
                    <p>${minPriceFormatted} MXN</p>
                </div>
            </div>
        `;
        return card;
    }

    // Function to format the delivery date
    function formatDeliveryDate(deliveredAt) {
        if (!deliveredAt) return "N/A";
        const deliverDate = new Date(deliveredAt);
        let formattedDate = new Intl.DateTimeFormat("es-MX", {
            month: "long",
            year: "numeric",
        }).format(deliverDate);
        formattedDate =
            formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
        return deliverDate < new Date() ? "Entrega Inmediata" : formattedDate;
    }

    // Function to send the user input to GPT and receive a summary
    async function summarizeInput(userInput) {
        console.log("Search query send to OpenAI..."); // Debugging log
        try {
            const promptResponse = await fetch("/prompt.txt");
            if (!promptResponse.ok) throw new Error("Failed to load initial prompt.");
            const initialPrompt = await promptResponse.text();
            const response = await fetch(
                "https://api.openai.com/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer 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`, // Replace with your OpenAI API key
                    },
                    body: JSON.stringify({
                        model: "gpt-4",
                        messages: [
                            { role: "system", content: initialPrompt },
                            {
                                role: "user",
                                content: `Please summarize the following text: "${userInput}"`,
                            },
                        ],
                        max_tokens: 100,
                        temperature: 0.5,
                    }),
                }
            );

            const data = await response.json();
            if (data.error) {
                console.error("API Error:", data.error.message);
                summaryResponseContainer.textContent =
                    "An error occurred: " + data.error.message;
                return;
            }

            if (data.choices && data.choices.length > 0) {
                const summary = data.choices[0].message.content;
                console.log("Summary received from Open AI...");
                console.log(summary); 
                console.log("-----------------------------------");
                displaySummaryAsChips(summary);
                searchProjects(summary);
            } else {
                console.error("Unexpected response format:", data);
                document.getElementById("summary-chip-container").textContent =
                    "No valid summary found in response.";
            }
        } catch (error) {
            console.error("Error fetching summary:", error);
            summaryResponseContainer.textContent =
                "An error occurred while summarizing.";
        }
    }

    // Function to display the summary as chips
    function displaySummaryAsChips(summary) {
        console.log("Inside displaySummaryAsChips function"); // Debugging log
        const container = document.getElementById("summary-chip-container");
        if (!container) {
            console.error("Summary chip container not found");
            return;
        }
        container.innerHTML = ""; // Clear existing chips
        // Split the summary by bullet points (handling different formats like "- ", "•", or tab characters)
        const bullets = summary.split(/\n[\-•]\s?|\n•\t|\n/).filter(Boolean);
        console.log("Bullets after split", bullets); // Debugging log

        // Remove the first bullet character if it starts with a bullet
        if (bullets[0].startsWith("•")) {
            bullets[0] = bullets[0].substring(2);
        }

        bullets.forEach((bullet) => {
            const chip = document.createElement("div");
            chip.classList.add("summary-chip");
            chip.textContent = bullet.trim();
            container.appendChild(chip);
        });
    }

    // Function to search projects using the summary
    async function searchProjects(summary) {
        console.log("Inside searchProjects function"); // Debugging log
        try {
            const response = await fetch('http://127.0.0.1:5001/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: summary, top_n: 120 })
            });

            const data = await response.json();
            console.log("Search results:", data);

            // Display the property cards based on the search results
            displayPropertyCardsForSearchResults(data);
        } catch (error) {
            console.error("Error fetching projects:", error);
        }
    }

    // Function to display property cards for search results
    function displayPropertyCardsForSearchResults(results) {
        console.log("Inside displayPropertyCardsForSearchResults function");
        const container = document.getElementById('property-cards-container');
        if (!container) {
            console.error("Property cards container not found");
            return;
        }
        container.innerHTML = ''; // Clear existing cards

        if (!Array.isArray(results) || results.length === 0) {
            container.innerHTML = '<p>No matching projects found.</p>';
            return;
        }

        results.forEach(result => {
            const card = createPropertyCardForSearchResults(result);
            container.appendChild(card);
        });
    }

    // Function to create a property card element for search results
    function createPropertyCardForSearchResults(project) {
        const card = document.createElement("div");
        card.classList.add("card");

        // Format the price as MXN currency
        let minPriceFormatted = project.price
            ? new Intl.NumberFormat("es-MX", {
                style: "currency",
                currency: "MXN",
                minimumFractionDigits: 0,
            }).format(project.price)
            : "Price Not Available";

        card.innerHTML = `
            <div class="card-image">
                <img src="${project.cover || "https://via.placeholder.com/312"}" alt="Image of ${project.name}">
                <div class="image-chip">
                    <p>Entrega Inmediata</p>
                </div>
            </div>
            <div class="card-details">
                <div class="price-info">
                    <h2 class="street">${project.name || "No Name"}</h2>
                    <h3 class="address">${project.neighborhood || "Unknown Neighborhood"}, ${project.zone || "Unknown Zone"}</h3>
                    <p>${minPriceFormatted} MXN</p>
                    <p>Similarity Score: ${(project.similarity_score * 100).toFixed(2)}%</p>
                </div>
            </div>
        `;
        return card;
    }
});