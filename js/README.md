# Real Estate AI Search Engine

## Overview

This project implements an advanced AI-powered real estate search engine that understands natural language queries to help users find properties matching their specific criteria. Instead of navigating through complex filter menus, users can simply type queries like "depas de 3 recamaras con bbq y piscina" (3-bedroom apartments with BBQ and swimming pool) and receive relevant results.

## How It Works

The system combines traditional filtering with state-of-the-art semantic search to provide accurate results:

1. **Natural Language Processing**: Parses user queries to identify both numeric filters (price range, bedroom count) and semantic criteria (amenities, features)
2. **Pre-filtering**: Applies hard numeric constraints to efficiently narrow down the property database
3. **Semantic Matching**: Uses embeddings from OpenAI's text-embedding-ada-002 model to find properties semantically similar to the search query
4. **Ranked Results**: Returns properties sorted by relevance score based on vector similarity

## Key Components

- **Flask Backend API**: Processes search requests and returns filtered results
- **Vector Embedding Generation**: Pre-computes embeddings for all properties in the database
- **Cosine Similarity Matching**: Finds the closest semantic matches to user queries
- **Advanced Filtering**: Handles complex criteria including price, area, bedrooms, bathrooms, parking, and delivery dates
- **User Query Summarization**: Uses GPT-4 to extract structured criteria from natural language input
- **Dual Search Results Display**: Shows both semantically matched properties and additional properties that meet basic criteria

## New Features

- **Summary Chips**: Visual representation of extracted search criteria for user verification
- **Improved Query Parsing**: Enhanced ability to detect price ranges (e.g., "4 a 6 millones")
- **Location Boost**: Properties in specifically mentioned neighborhoods receive a relevance boost
- **Two-Tier Results**: Recommended properties (high semantic match) shown separately from other matching properties
- **Mobile-Responsive UI**: Enhanced interface that works across device sizes

## Benefits

### For Users
- **Natural Search Experience**: No need to learn complex filtering interfaces
- **Intuitive Results**: Properties that best match the overall intent appear first
- **Comprehensive Search**: Considers all property attributes, not just predefined filter options
- **Visual Feedback**: Summary chips confirm the system understood the search criteria

### For Developers
- **Operational Efficiency**: Eliminates the need to create and maintain numerous specific filter fields
- **Improved Data Management**: Simplifies the process of adding new properties
- **Scalable Architecture**: Embeddings approach scales well with growing inventory
- **Language Flexibility**: Handles queries in both Spanish and English

## Technical Stack

- **Backend**: Flask (Python)
- **AI Models**: 
 - OpenAI's text-embedding-ada-002 for vector embeddings
 - GPT-4 for query understanding and summarization
- **Data Processing**: NumPy, scikit-learn for vector operations
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Cross-Origin Support**: Flask-CORS for API access

## Getting Started

1. Set up your OpenAI API key in the appropriate configuration files
2. Run the pre-indexing notebook to generate embeddings for your property database
3. Start the Flask server with `python app.py` to begin handling search requests
4. Open index.html in a web browser or serve it using a local development server

## Project Structure

- `app.py`: Flask backend for handling search requests
- `index.html`: Main frontend entry point
- `script.js`: Frontend logic for user interactions and API calls
- `styles.css`: Styling for the application
- `pre-indexing-and-embeddings.ipynb`: Notebook for generating property embeddings
- `prompt.txt`: System prompt for GPT query understanding

## Future Enhancements

- Implement feedback mechanism to improve search results over time
- Add multi-language support for queries in different languages
- Develop a hybrid search that combines semantic results with popularity metrics
- Implement user personalization based on previous search patterns

---

This project represents a significant advancement in real estate search technology, making it easier for users to find their ideal properties while reducing the operational overhead of maintaining complex filtering systems.