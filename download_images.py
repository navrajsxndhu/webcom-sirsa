import os
import requests
import json
import time

insta_gallery = [
    # --- Shipra Miglani Official Images ---
    "https://scontent-iad3-2.cdninstagram.com/v/t51.2885-15/341697227_914569853006240_8586027660232759902_n.jpg",
    "https://scontent-iad3-2.cdninstagram.com/v/t51.2885-15/340455581_160351717013442_1140087093282218116_n.jpg",
    "https://scontent-iad3-1.cdninstagram.com/v/t51.2885-15/334237748_896328338304918_2039947936665792019_n.jpg",
    "https://scontent-iad3-2.cdninstagram.com/v/t51.2885-15/333671169_520119840251767_4246473130541785266_n.jpg",
    
    # --- Webcom Sirsa Images ---
    "https://scontent-iad3-1.cdninstagram.com/v/t51.2885-15/330554174_728669528731118_6541571597405106202_n.jpg",
    "https://scontent-iad3-1.cdninstagram.com/v/t51.2885-15/330663731_1384074062386121_1303957262071850117_n.jpg",
    "https://scontent-iad3-2.cdninstagram.com/v/t51.2885-15/329188049_568537591979929_8071827471206159670_n.jpg",
    "https://scontent-iad3-1.cdninstagram.com/v/t51.2885-15/326829775_574441551221191_1141470487431326490_n.jpg",
    "https://scontent-iad3-1.cdninstagram.com/v/t51.2885-15/325251410_1349092495893077_7749448833959146187_n.jpg",
    "https://scontent-iad3-2.cdninstagram.com/v/t51.2885-15/325695507_193561936622858_3311311027961208034_n.jpg",
    "https://scontent-iad3-2.cdninstagram.com/v/t51.2885-15/324683074_861439611634591_5458327918511746409_n.jpg"
]

save_dir = r"c:\Users\sk\OneDrive\Desktop\webcom-complete\client\assets\images\gallery"
os.makedirs(save_dir, exist_ok=True)

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
}

valid_urls = []
for i, url in enumerate(insta_gallery):
    try:
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            file_name = f"insta_gallery_{i}.jpg"
            file_path = os.path.join(save_dir, file_name)
            with open(file_path, "wb") as f:
                f.write(response.content)
            valid_urls.append(f"assets/images/gallery/{file_name}")
            print(f"Downloaded: {file_name}")
        else:
            print(f"Failed ({response.status_code}): {url}")
    except Exception as e:
        print(f"Error downloading {url}: {e}")

print("Total downloaded:", len(valid_urls))
