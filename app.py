from flask import Flask, request, jsonify
from openai import OpenAI

client = OpenAI(api_key='sk-proj-xxxxxx')
import json
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from flask_cors import CORS
from datetime import datetime, timezone
from dateutil.parser import parse  


# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Set OpenAI API key

# Load projects with precomputed embeddings from JSON file
with open('data/projects_with_embeddings.json', 'r') as f:
    projects = json.load(f)

# Function to generate an embedding for a query
def generate_query_embedding(query):
    response = client.embeddings.create(input=query, model="text-embedding-ada-002")
    return response.data[0].embedding

# Update the pre_filter_projects function in app.py
def pre_filter_projects(projects, filters):
    print("Received filters:", filters)
    if not isinstance(filters, dict):
        print("Warning: filters is not a dictionary. Defaulting to an empty dictionary.")
        filters = {}
    
    # If no filters are provided, return all projects
    if not filters:
        print("No filters provided, returning all projects")
        return projects
    
    filtered_projects = []
    print(f"Starting filtering with {len(projects)} projects")
    
    # Debug information about filters
    for key, value in filters.items():
        print(f"Filter: {key} = {value}")
    
    price_filtered_count = 0
    for project in projects:
        include_project = True
        ims = project.get('ims', {})
        location = project.get('location', {})
        
        # Filter by price - STRICT (no buffer)
        if filters.get('min_price') is not None:
            project_price = ims.get('min_price')
            if project_price is None or project_price < filters['min_price']:
                include_project = False
                continue
        
        if filters.get('max_price') is not None:
            project_price = ims.get('min_price')
            if project_price is None or project_price > filters['max_price']:
                include_project = False
                continue
        
        # Count projects that pass price filter
        if include_project:
            price_filtered_count += 1
        
        # Filter by area - if specified
        if filters.get('min_area') is not None:
            project_area = ims.get('min_area')
            if project_area is None or project_area < filters['min_area']:
                include_project = False
                continue
        
        # Filter by bedrooms - if specified
        if filters.get('min_bedroom') is not None:
            bedrooms = ims.get('bedrooms_stats', {})
            min_bedroom = bedrooms.get('min_bedroom')
            if min_bedroom is None or min_bedroom < filters['min_bedroom']:
                include_project = False
                continue
        
        # Filter by bathrooms - if specified
        if filters.get('min_bathroom') is not None:
            bathrooms = ims.get('bathrooms_stats', {})
            min_bathroom = bathrooms.get('min_bathroom')
            if min_bathroom is None or min_bathroom < filters['min_bathroom']:
                include_project = False
                continue
        
        # If project passes all filters, add it to filtered list
        if include_project:
            filtered_projects.append(project)
    
    print(f"Price filter passed: {price_filtered_count} projects")
    print(f"All filters passed: {len(filtered_projects)} projects")
    return filtered_projects

@app.route('/search', methods=['POST'])
def search_projects():
    try:
        # Parse request data
        data = request.get_json()
        query = data.get('query', '').strip()
        
        if not query:
            return jsonify({"error": "Query cannot be empty"}), 400
            
        top_n = data.get('top_n', 10)
        filters = data.get('filters', {})
        
        print(f"Search query: {query}")
        print(f"Filters: {filters}")
        
        # Step 1: Pre-filter projects based on provided filters
        filtered_projects = pre_filter_projects(projects, filters)
        print(f"After pre-filtering: {len(filtered_projects)} projects")
        
        # Format pre-filtered projects for response
        pre_filtered_results = []
        for proj in filtered_projects[:50]:  # Limit to top 50 to avoid large responses
            try:
                pre_filtered_results.append({
                    "name": proj.get('name', 'Unknown'),
                    "description": proj.get('description', ''),
                    "cover": proj.get('attributes', {}).get('cover', None),
                    "price": proj.get('ims', {}).get('min_price', None),
                    "neighborhood": proj.get('location', {}).get('neighborhood', None),
                    "zone": proj.get('location', {}).get('zone', None),
                    "delivered_at": proj.get('ims', {}).get('delivered_at', None)
                })
            except Exception as err:
                print(f"Error formatting pre-filtered result: {str(err)}")
                continue
        
        # Check if we have any projects after filtering
        if not filtered_projects:
            print("No projects match the filters. Returning empty results.")
            return jsonify({
                "pre_filtered_results": [],
                "semantic_results": []
            })
        
        # Step 2: Generate embedding for the query
        query_embedding = generate_query_embedding(query)
        
        # Step 3: Calculate similarity with each pre-filtered project's embedding
        similarities = []
        for project in filtered_projects:
            try:
                project_embedding = project.get('embedding')
                if not project_embedding:
                    print(f"Warning: No embedding for project {project.get('name')}")
                    continue
                    
                query_embedding_array = np.array(query_embedding).reshape(1, -1)
                project_embedding_array = np.array(project_embedding).reshape(1, -1)
                
                similarity = cosine_similarity(query_embedding_array, project_embedding_array)[0][0]
                
                # Create a similarity boost for location matches
                location_boost = 0
                project_location = project.get('location', {})
                project_neighborhood = project_location.get('neighborhood', '').lower()
                project_zone = project_location.get('zone', '').lower()
                
                # Check for location terms in the query
                for location_term in ['roma', 'condesa', 'polanco', 'napoles', 'juárez', 'juarez']:
                    if location_term in query.lower():
                        if location_term in project_neighborhood or location_term in project_zone:
                            location_boost = 0.1  # 10% boost for location match
                            break
                
                # Apply location boost to similarity score
                adjusted_similarity = similarity + location_boost
                similarities.append((project, adjusted_similarity))
            except Exception as err:
                print(f"Error processing project {project.get('name', 'unknown')}: {str(err)}")
                continue
        
        # Sort projects by similarity score in descending order
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        # Return the top N most similar projects
        semantic_results = []
        for proj, sim in similarities[:top_n]:
            try:
                semantic_results.append({
                    "name": proj.get('name', 'Unknown'),
                    "description": proj.get('description', ''),
                    "cover": proj.get('attributes', {}).get('cover', None),
                    "price": proj.get('ims', {}).get('min_price', None),
                    "neighborhood": proj.get('location', {}).get('neighborhood', None),
                    "zone": proj.get('location', {}).get('zone', None),
                    "delivered_at": proj.get('ims', {}).get('delivered_at', None),
                    "similarity_score": float(sim)
                })
            except Exception as err:
                print(f"Error formatting project result: {str(err)}")
                continue
        
        print(f"Returning {len(pre_filtered_results)} pre-filtered and {len(semantic_results)} semantic results")
        return jsonify({
            "pre_filtered_results": pre_filtered_results,
            "semantic_results": semantic_results
        })
    except Exception as e:
        print(f"Search error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Run the Flask app
if __name__ == '__main__':
    app.run(port=5001)
