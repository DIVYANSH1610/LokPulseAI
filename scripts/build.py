import os
import sys

# Ensure the scripts directory is in the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from generators.design_system import generate_design_system
from generators.ui_components import generate_ui_components
from generators.ai_components import generate_ai_components
from generators.dashboard_pages import generate_dashboard_components
from generators.landing_page import generate_landing_page
from generators.complaint_pages import generate_complaint_components
from generators.maps_components import generate_maps_components
from generators.charts import generate_charts
from generators.language_system import generate_language_system
def main():
    print("🚀 Starting LokPulse AI Premium Frontend Generation...")
    
    # Define the target frontend directory relative to this script
    # Assuming this script is inside lokpulse-ai-v4/scripts/
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))
    
    # Run all generators
    generate_design_system(base_dir)
    generate_ui_components(base_dir)
    generate_ai_components(base_dir)
    generate_dashboard_components(base_dir)
    generate_landing_page(base_dir)
    generate_complaint_components(base_dir)
    generate_maps_components(base_dir)
    generate_charts(base_dir)
    generate_language_system(base_dir)
    print("\n✨ Frontend generation complete!")
    print("Don't forget to install the required premium dependencies:")
    print("npm install framer-motion lucide-react @react-google-maps/api clsx tailwind-merge")

if __name__ == "__main__":
    main()