import smtplib
import csv
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# --- CONFIGURATION ---
GMAIL_USER = 'navysandhu970@gmail.com' 
GMAIL_PASSWORD = 'uzdq kvtr tsuc zkfe' # Generate this in Google Account -> Security -> App Passwords

def send_marketing_email(target_name, target_email):
    try:
        # Create message container
        msg = MIMEMultipart()
        msg['From'] = GMAIL_USER
        msg['To'] = target_email
        msg['Subject'] = "🚀 Transform Your Institute's Digital Presence"

        # The Marketing Message
        body = f"""
Hello {target_name},

I hope you're doing well.

I’m Navraj Sandhu, and I specialize in building Premium, Apple-Inspired Websites specifically for IELTS, PTE, and Study Visa institutes.

Most educational websites look outdated, but I create modern, high-performance platforms that actually attract more students.

Take a look at my latest work for Webcom Sirsa:
👉 https://webcom-sirsa.vercel.app/

What I provide:
✅ Stunning Visuals: Dark Mode & Glassmorphism (Premium Look).
✅ Admin Dashboard: Manage Staff, Results, and Gallery yourself in seconds.
✅ Lightning Fast: Optimized for low-end mobile devices.
✅ Secure Cloud: Permanent data storage (No more losing leads).

If you want to upgrade your institute’s brand value and stand out from the competition, let’s chat!

Best Regards,
Navraj Sandhu
Phone: 9017851916
Portfolio: https://webcom-sirsa.vercel.app/
        """

        msg.attach(MIMEText(body, 'plain'))

        # Send the email
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(GMAIL_USER, GMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Successfully sent to: {target_name} ({target_email})")
        return True
    except Exception as e:
        print(f"❌ Failed to send to {target_name}: {str(e)}")
        return False

def main():
    print("🚀 Starting Marketing Campaign...")
    print("-" * 30)
    
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    contacts_path = os.path.join(script_dir, 'contacts.csv')
    
    with open(contacts_path, mode='r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            name = row['Name']
            email = row['Email']
            
            if name == "Example Institute": continue # Skip the example
            
            send_marketing_email(name, email)
            # Sleep for 2 seconds between emails to avoid being flagged as spam
            time.sleep(2)

    print("-" * 30)
    print("🏁 Campaign Complete!")

if __name__ == "__main__":
    main()
