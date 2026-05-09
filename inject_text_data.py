import json

data_file = r"c:\Users\sk\OneDrive\Desktop\webcom-complete\server\data.json"

with open(data_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 1. Update Settings
data['settings']['phone'] = "090507 00577, 090507 00511"
data['settings']['address'] = "52, Basement, City Photostat, Opposite Town Park, near Jaat Dharamshala Road, Sirsa, Haryana"

# 2. Add New Real Testimonials
new_testimonials = [
    {
      "student": "Alka",
      "score": "IELTS 6.5 Bands",
      "review": "Achieved my dream score! Thank you Webcom Sirsa for the amazing guidance.",
      "photo": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&auto=format&fit=crop"
    },
    {
      "student": "Priyanka",
      "score": "IELTS 6.5 Bands",
      "review": "The mock tests and faculty support were incredible. Highly recommended!",
      "photo": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop"
    },
    {
      "student": "Harman",
      "score": "PTE 62",
      "review": "Webcom's state-of-the-art lab helped me crack PTE in my very first attempt.",
      "photo": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop"
    },
    {
      "student": "Harkirat Singh",
      "score": "PTE 69",
      "review": "Best institute in Sirsa! The faculty is incredibly supportive and knowledgeable.",
      "photo": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop"
    }
]

# Prepend the new real testimonials to the beginning
data['testimonials'] = new_testimonials + data['testimonials']

with open(data_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Injected real extracted text data into data.json")
