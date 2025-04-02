from flask import Flask, request, jsonify
from openai import OpenAI

client = OpenAI(api_key='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')
import json
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from flask_cors import CORS
from datetime import datetime, timezone
from dateutil.parser import parse  


# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Set OpenAI API key

# Load projects with precomputed embeddings from JSON file
with open('data/projects_with_embeddings.json', 'r') as f:
    projects = json.load(f)

# Function to generate an embedding for a query
def generate_query_embedding(query):
    response = client.embeddings.create(input=query, model="text-embedding-ada-002")
    return response.data[0].embedding

# Function to pre-filter projects based on criteria
def pre_filter_projects(projects, filters):
    print("Received filters:", filters)
    if not isinstance(filters, dict):
        print("Warning: filters is not a dictionary. Defaulting to an empty dictionary.")
        filters = {}  # Default to empty dictionary if filters is not the right type

    filtered_projects = []
    for project in projects:
        ims = project.get('ims', {})

        # Retrieve and verify all necessary values
        price = ims.get('min_price')
        area = ims.get('min_area')
        bedrooms = ims.get('bedrooms_stats', {})
        bathrooms = ims.get('bathrooms_stats', {})
        parking = ims.get('parking_stats', {}).get('total')
        delivered_at = ims.get('delivered_at')

        # Debug: Print values being checked for each project
        print(f"Checking project: {project['name']}")
        print(f"Price: {price}, Area: {area}, Bedrooms: {bedrooms}, Bathrooms: {bathrooms}, Parking: {parking}, Delivered at: {delivered_at}")
        print(f"Filters - min_price: {filters.get('min_price')}, max_price: {filters.get('max_price')}")

        # Filter by delivery date range
        if filters.get('delivered_at_min') or filters.get('delivered_at_max'):
            try:
                # Parse the delivery date of the project using dateutil.parser
                delivered_at_date = parse(delivered_at) if delivered_at else None
                delivered_at_min = parse(filters.get('delivered_at_min')).replace(tzinfo=timezone.utc) if filters.get('delivered_at_min') else None
                delivered_at_max = parse(filters.get('delivered_at_max')).replace(tzinfo=timezone.utc) if filters.get('delivered_at_max') else None

                # Ensure all dates are offset-aware
                if delivered_at_date:
                    if delivered_at_date.tzinfo is None:
                        delivered_at_date = delivered_at_date.replace(tzinfo=timezone.utc)

                    if delivered_at_min and delivered_at_date < delivered_at_min:
                        print(f"Excluding {project['name']} for delivery date before delivered_at_min")
                        continue
                    if delivered_at_max and delivered_at_date > delivered_at_max:
                        print(f"Excluding {project['name']} for delivery date after delivered_at_max")
                        continue
                else:
                    print(f"Excluding {project['name']} for missing delivery date")
                    continue
            except Exception as e:
                print(f"Error parsing delivery date for {project['name']}: {e}")
                continue

        # Apply filters and exclude projects not meeting criteria
        if filters.get('min_price') is not None and (price is None or price < filters['min_price']):
            print(f"Excluding {project['name']} for price below min_price")
            continue
        if filters.get('max_price') is not None and (price is None or price > filters['max_price']):
            print(f"Excluding {project['name']} for price above max_price")
            continue
        if filters.get('min_area') is not None and (area is None or area < filters['min_area']):
            print(f"Excluding {project['name']} for area below min_area")
            continue
        if filters.get('max_area') is not None and (area is None or area > filters['max_area']):
            print(f"Excluding {project['name']} for area above max_area")
            continue
        if filters.get('min_bedroom') is not None and (bedrooms.get('min_bedroom') is None or bedrooms['min_bedroom'] < filters['min_bedroom']):
            print(f"Excluding {project['name']} for bedrooms below min_bedroom")
            continue
        if filters.get('max_bedroom') is not None and (bedrooms.get('max_bedroom') is None or bedrooms['max_bedroom'] > filters['max_bedroom']):
            print(f"Excluding {project['name']} for bedrooms above max_bedroom")
            continue
        if filters.get('min_bathroom') is not None and (bathrooms.get('min_bathroom') is None or bathrooms['min_bathroom'] < filters['min_bathroom']):
            print(f"Excluding {project['name']} for bathrooms below min_bathroom")
            continue
        if filters.get('max_bathroom') is not None and (bathrooms.get('max_bathroom') is None or bathrooms['max_bathroom'] > filters['max_bathroom']):
            print(f"Excluding {project['name']} for bathrooms above max_bathroom")
            continue
        if filters.get('parking') is not None and (parking is None or parking < filters['parking']):
            print(f"Excluding {project['name']} for parking below required")
            continue
        if filters.get('delivered_at') is not None and delivered_at != filters['delivered_at']:
            print(f"Excluding {project['name']} for delivered_at not matching")
            continue

        # If all conditions pass, add project to filtered list
        filtered_projects.append(project)
        print(f"Including {project['name']} in filtered results")

    print(f"Total filtered projects: {len(filtered_projects)}")
    return filtered_projects

# Endpoint to handle search requests
@app.route('/search', methods=['POST'])
def search_projects():
    try:
        # Parse request data
        data = request.get_json()

        # Mandatory field
        query = data.get('query', '').strip()

        # Optional fields
        top_n = data.get('top_n', 10)  # Default to top 10 results if not specified
        filters = data.get('filters', {})

        # Validate input query
        if not query:
            return jsonify({"error": "Query cannot be empty"}), 400

        # Step 1: Pre-filter projects based on provided filters
        filtered_projects = pre_filter_projects(projects, filters)

        # Step 2: Generate embedding for the query
        query_embedding = generate_query_embedding(query)

        # Step 3: Calculate similarity with each pre-filtered project's embedding
        similarities = []
        for project in filtered_projects:
            try:
                const_embedding = project.get('embedding')
                if not const_embedding:
                    print(f"Skipping {project['name']} due to missing embedding")
                    continue
                project_embedding = np.array(const_embedding)
                similarity = cosine_similarity([query_embedding], [project_embedding])[0][0]
                similarities.append((project, similarity))
            except Exception as err:
                print(f"Error processing project {project['name']}: {err}")
                continue

        # Sort projects by similarity score in descending order
        similarities.sort(key=lambda x: x[1], reverse=True)

        # Retrieve top N most similar projects
        top_projects = [
            {
                "name": proj['name'],
                "description": proj['description'],
                "cover": proj['attributes'].get('cover', None),
                "price": proj['ims'].get('min_price', None),
                "neighborhood": proj['location'].get('neighborhood', None),
                "zone": proj['location'].get('zone', None),
                "delivered_at": proj['ims'].get('delivered_at', None),
                "similarity_score": sim
            } 
            for proj, sim in similarities[:top_n]
        ]

        # Include both pre-filtered and final top projects in the response
        response_data = {
            "pre_filtered_projects": [
                {
                    "name": proj['name'],
                    "price": proj['ims'].get('min_price', None),
                    "description": proj['description'],
                    "cover": proj['attributes'].get('cover', None),
                    "neighborhood": proj['location'].get('neighborhood', None),
                    "zone": proj['location'].get('zone', None),
                } for proj in filtered_projects
            ],
            "top_projects": top_projects
        }

        return jsonify(response_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Run the Flask app
if __name__ == '__main__':
    app.run(port=5001)
