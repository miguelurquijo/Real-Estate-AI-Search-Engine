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
    function createPropertyCardForSearchResults(project) {
        const card = document.createElement("div");
        card.classList.add("card");
    
        // Safely access properties with fallbacks
        const name = project.name || "No Name";
        const neighborhood = project.neighborhood || "Unknown Neighborhood";
        const zone = project.zone || "Unknown Zone";
        const cover = project.cover || "https://via.placeholder.com/312";
        const price = project.price;
        const similarityScore = project.similarity_score;
    
        // Format the price as MXN currency - divide by millions for display
        let priceFormatted;
        if (price) {
            if (price >= 1000000) {
                // Format in millions (e.g., "4.5 millones")
                const millionsValue = (price / 1000000).toFixed(1);
                priceFormatted = `${millionsValue} millones MXN`;
            } else {
                // Format as regular currency
                priceFormatted = new Intl.NumberFormat("es-MX", {
                    style: "currency",
                    currency: "MXN",
                    minimumFractionDigits: 0,
                }).format(price);
            }
        } else {
            priceFormatted = "Precio no disponible";
        }
    
        card.innerHTML = `
            <div class="card-image">
                <img src="${cover}" alt="Image of ${name}">
                <div class="image-chip">
                    <p>Entrega Inmediata</p>
                </div>
                <div class="image-content">
                    <h2 class="street">${name}</h2>
                    <h3 class="address">${neighborhood}, ${zone}</h3>
                </div>
            </div>
            <div class="card-details">
                <div class="price-info">
                    <p>${priceFormatted}</p>
                    ${similarityScore ? `<small>Match: ${(similarityScore * 100).toFixed(0)}%</small>` : ''}
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
                        Authorization: `Bearer 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`
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
        console.log("Inside searchProjects function");
        
        try {
            // Extract potential filter criteria from the summary
            const filters = extractFiltersFromSummary(summary);
            console.log("Extracted filters:", filters);
            
            const response = await fetch('http://127.0.0.1:5001/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    query: summary, 
                    top_n: 50,
                    filters: filters // Send extracted filters to backend
                })
            });
    
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
    
            const data = await response.json();
            console.log("Search results:", data);
    
            // Check if we received the expected data structure
            if (!data || (!data.pre_filtered_results && !data.semantic_results)) {
                throw new Error("Unexpected response format from server");
            }
    
            // Show both result sets
            const preFilteredResults = data.pre_filtered_results || [];
            const semanticResults = data.semantic_results || [];
            
            displaySearchResults(preFilteredResults, semanticResults);
        } catch (error) {
            console.error("Error fetching projects:", error);
            // Show error message in UI
            const container = document.getElementById('property-cards-container');
            if (container) {
                container.innerHTML = `<p class="error-message">Error finding properties: ${error.message}</p>`;
            }
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
        // Check if result has the necessary properties
        if (result) {
            const card = createPropertyCardForSearchResults(result);
            container.appendChild(card);
        }
    });
    }

    // Function to create a property card element for search results
    function createPropertyCardForSearchResults(project) {
        const card = document.createElement("div");
        card.classList.add("card");
    
        // Safely access properties with fallbacks
        const name = project.name || "No Name";
        const neighborhood = project.neighborhood || "Unknown Neighborhood";
        const zone = project.zone || "Unknown Zone";
        const cover = project.cover || "https://via.placeholder.com/312";
        const price = project.price;
        const similarityScore = project.similarity_score;
    
        // Format the price as MXN currency
        let minPriceFormatted = price
            ? new Intl.NumberFormat("es-MX", {
                style: "currency",
                currency: "MXN",
                minimumFractionDigits: 0,
            }).format(price)
            : "Price Not Available";
    
        card.innerHTML = `
            <div class="card-image">
                <img src="${cover}" alt="Image of ${name}">
                <div class="image-chip">
                    <p>Entrega Inmediata</p>
                </div>
                <div class="image-content">
                    <h2 class="street">${name}</h2>
                    <h3 class="address">${neighborhood}, ${zone}</h3>
                </div>
            </div>
            <div class="card-details">
                <div class="price-info">
                    <p>${minPriceFormatted}</p>
                    ${similarityScore ? `<small>Match: ${(similarityScore * 100).toFixed(0)}%</small>` : ''}
                </div>
            </div>
        `;
        return card;
    }

    // Add this function to extract filters from summary text
    function extractFiltersFromSummary(summary) {
        const filters = {};
        
        // Extract price information - look for millones pattern
        const minPriceMatch = summary.match(/Precio\s+Mínimo:\s*(\d[\d,]*)/i) || 
                              summary.match(/Precio.*?(\d[\d,]*)\s*(?:a|millones).*?/i) ||
                              summary.match(/de\s*(\d[\d,]*)\s*(?:a|millones)/i);
                              
        const maxPriceMatch = summary.match(/Precio\s+Máximo:\s*(\d[\d,]*)/i) || 
                              summary.match(/a\s*(\d[\d,]*)\s*millones/i);
        
        console.log("Min price match:", minPriceMatch);
        console.log("Max price match:", maxPriceMatch);
        
        if (minPriceMatch && minPriceMatch[1]) {
            // Convert to millions (e.g., convert "4" to 4000000)
            filters.min_price = parseInt(minPriceMatch[1].replace(/,/g, '')) * 1000000;
            console.log("Set min_price to:", filters.min_price);
        }
        
        if (maxPriceMatch && maxPriceMatch[1]) {
            // Convert to millions (e.g., convert "6" to 6000000)
            filters.max_price = parseInt(maxPriceMatch[1].replace(/,/g, '')) * 1000000;
            console.log("Set max_price to:", filters.max_price);
        }
        
        // Extract bedrooms information
        const bedroomsMatch = summary.match(/Recamaras:\s*(\d+)/i);
        if (bedroomsMatch && bedroomsMatch[1]) {
            filters.min_bedroom = parseInt(bedroomsMatch[1]);
        }
        
        // Extract bathrooms information
        const bathroomsMatch = summary.match(/Baños:\s*(\d+)/i);
        if (bathroomsMatch && bathroomsMatch[1]) {
            filters.min_bathroom = parseInt(bathroomsMatch[1]);
        }
        
        // Extract area information
        const areaMatch = summary.match(/Tamaño:\s*(\d+)/i) || 
                         summary.match(/(\d+)\s*m2/i);
        if (areaMatch && areaMatch[1]) {
            filters.min_area = parseInt(areaMatch[1]);
        }
        
        // Extract location information
        const locationMatch = summary.match(/Ubicación:\s*([^•\n]+)/i);
        if (locationMatch && locationMatch[1]) {
            const locationName = locationMatch[1].trim();
            filters.location = { neighborhood: locationName };
        }
        
        console.log("Extracted filters:", filters);
        return filters;
    }

    function displaySearchResults(preFilteredResults, semanticResults) {
        const container = document.getElementById('property-cards-container');
        if (!container) {
            console.error("Property cards container not found");
            return;
        }
        
        // Clear existing content
        container.innerHTML = '';
        
        // Create section headings and results display
        if (preFilteredResults.length === 0 && semanticResults.length === 0) {
            container.innerHTML = '<div class="no-results">No matching properties found</div>';
            return;
        }
        
        // Display semantic results section
        if (semanticResults.length > 0) {
            const semanticSection = document.createElement('div');
            semanticSection.className = 'results-section';
            
            const semanticHeading = document.createElement('h2');
            semanticHeading.className = 'results-heading';
            semanticHeading.textContent = 'Recommended Properties';
            semanticSection.appendChild(semanticHeading);
            
            const semanticResultsContainer = document.createElement('div');
            semanticResultsContainer.className = 'plp-body';
            
            semanticResults.forEach(result => {
                const card = createPropertyCardForSearchResults(result);
                semanticResultsContainer.appendChild(card);
            });
            
            semanticSection.appendChild(semanticResultsContainer);
            container.appendChild(semanticSection);
        }
        
        // Display pre-filtered results section
        if (preFilteredResults.length > 0) {
            // Only show pre-filtered section if there are no semantic results 
            // or if there are fewer than 5 semantic results
            if (semanticResults.length === 0 || semanticResults.length < 5) {
                const preFilteredSection = document.createElement('div');
                preFilteredSection.className = 'results-section pre-filtered';
                
                const preFilteredHeading = document.createElement('h2');
                preFilteredHeading.className = 'results-heading';
                preFilteredHeading.textContent = 'Other Properties Within Your Criteria';
                preFilteredSection.appendChild(preFilteredHeading);
                
                const preFilteredResultsContainer = document.createElement('div');
                preFilteredResultsContainer.className = 'plp-body';
                
                preFilteredResults.forEach(result => {
                    // Don't show results that are already in the semantic results
                    if (!semanticResults.some(sr => sr.name === result.name)) {
                        const card = createPropertyCardForSearchResults(result);
                        preFilteredResultsContainer.appendChild(card);
                    }
                });
                
                if (preFilteredResultsContainer.children.length > 0) {
                    preFilteredSection.appendChild(preFilteredResultsContainer);
                    container.appendChild(preFilteredSection);
                }
            }
        }
    }

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
                <img src="${listing.attributes?.cover || "https://via.placeholder.com/312"}" alt="Image of ${listing.name}">
                <div class="image-chip">
                    <p>${deliverAtFormatted}</p>
                </div>
                <div class="image-content">
                    <h2 class="street">${listing.name || "No Name"}</h2>
                    <h3 class="address">${listing.location?.neighborhood || "Unknown Neighborhood"}, ${listing.location?.zone || "Unknown Zone"}</h3>
                </div>
            </div>
            <div class="card-details">
                <div class="price-info">
                    <p>${minPriceFormatted}</p>
                </div>
            </div>
        `;
        return card;
    }
});