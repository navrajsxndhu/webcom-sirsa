import json

data_file = r"c:\Users\sk\OneDrive\Desktop\webcom-complete\server\data.json"

with open(data_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Categorized Gallery Images
new_gallery = [
    # Building / Facilities
    {"id": 1, "url": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1200&auto=format&fit=crop", "category": "building"},
    {"id": 2, "url": "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1200&auto=format&fit=crop", "category": "building"},
    {"id": 3, "url": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop", "category": "building"},
    
    # Students
    {"id": 4, "url": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop", "category": "student"},
    {"id": 5, "url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop", "category": "student"},
    {"id": 6, "url": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&auto=format&fit=crop", "category": "student"},
    {"id": 7, "url": "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200&auto=format&fit=crop", "category": "student"},
    
    # Classroom / Learning
    {"id": 8, "url": "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop", "category": "classroom"},
    {"id": 9, "url": "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?q=80&w=1200&auto=format&fit=crop", "category": "classroom"},
    {"id": 10, "url": "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=1200&auto=format&fit=crop", "category": "classroom"},
    {"id": 11, "url": "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1200&auto=format&fit=crop", "category": "classroom"}
]

data['gallery'] = new_gallery

with open(data_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Gallery updated with categorized images.")
