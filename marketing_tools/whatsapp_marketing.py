import csv
import webbrowser
import time
import urllib.parse
import os

# --- THE MESSAGE ---
MESSAGE_TEMPLATE = """
Hello {name},

I hope you're doing well.

I noticed your institute is doing great work in Sirsa, but your digital presence could be much stronger. Most students today choose an institute based on how professional their website looks.

I specialize in building Premium, Apple-Inspired websites for educational institutes. 

Check out my latest work for Webcom Sirsa: 
👉 https://webcom-sirsa.vercel.app/

What I offer:
✅ Premium UI/UX (Dark Mode & Glassmorphism)
✅ Custom Admin Panel (Manage your own results/staff)
✅ Lead Generator (Student inquiries sent to your dashboard)

If you'd like to upgrade your brand and stand out, I'd love to chat!

Best Regards,
Navraj Sandhu
9017851916
"""

def generate_whatsapp_links():
    print("🚀 WhatsApp Marketing Tool Initialized...")
    print("-" * 30)
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    contacts_path = os.path.join(script_dir, 'whatsapp_contacts.csv')
    
    try:
        with open(contacts_path, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                name = row['Name']
                phone = row['Phone'].strip().replace(" ", "").replace("-", "")
                
                if name == "Test Me": continue
                
                # Format the message
                message = MESSAGE_TEMPLATE.format(name=name)
                encoded_message = urllib.parse.quote(message)
                
                # Create the WhatsApp Link
                whatsapp_url = f"https://web.whatsapp.com/send?phone={phone}&text={encoded_message}"
                
                print(f"👉 Link for {name}: {whatsapp_url}\n")
                
                # Option to open automatically (Uncomment to use automation)
                # print(f"Opening WhatsApp for {name}...")
                # webbrowser.open(whatsapp_url)
                # time.sleep(10) # Wait for page to load
                
        print("-" * 30)
        print("🏁 All links generated! Copy and paste them into your browser to send.")
        print("💡 TIP: Sending manually is much safer to avoid being banned by WhatsApp.")

    except FileNotFoundError:
        print(f"❌ Error: {contacts_path} not found!")

if __name__ == "__main__":
    generate_whatsapp_links()
