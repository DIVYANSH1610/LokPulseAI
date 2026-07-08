from .utils import write_file

def generate_design_system(base_dir: str):
    css_content = """
@import "tailwindcss";

@theme {
  --color-background: hsl(210 40% 98%);
  --color-foreground: hsl(222.2 84% 4.9%);
  
  --color-card: hsl(0 0% 100%);
  --color-card-foreground: hsl(222.2 84% 4.9%);
  
  --color-popover: hsl(0 0% 100%);
  --color-popover-foreground: hsl(222.2 84% 4.9%);
  
  --color-primary: hsl(173 58% 39%);
  --color-primary-foreground: hsl(210 40% 98%);
  
  --color-secondary: hsl(210 40% 96.1%);
  --color-secondary-foreground: hsl(222.2 47.4% 11.2%);
  
  --color-muted: hsl(210 40% 96.1%);
  --color-muted-foreground: hsl(215.4 16.3% 46.9%);
  
  --color-accent: hsl(210 40% 96.1%);
  --color-accent-foreground: hsl(222.2 47.4% 11.2%);
  
  --color-destructive: hsl(0 84.2% 60.2%);
  --color-destructive-foreground: hsl(210 40% 98%);
  
  --color-border: hsl(214.3 31.8% 91.4%);
  --color-input: hsl(214.3 31.8% 91.4%);
  --color-ring: hsl(215 20.2% 65.1%);
  
  --radius-lg: 1rem;
  --radius-md: calc(1rem - 2px);
  --radius-sm: calc(1rem - 4px);
  
  /* Retain your specific legacy variables if components rely on them */
  --color-navy-900: #0f172a;
  --color-teal-100: #ccfbf1;
  --color-teal-600: #0d9488;
  --color-ink: #0f172a;
  --color-ink-muted: #64748b;
  --color-paper: #f8fafc;
}

/* Base styles */
@layer base {
  *,
  ::after,
  ::before,
  ::backdrop,
  ::file-selector-button {
    border-color: var(--color-border, currentColor);
  }
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
    font-family: Arial, Helvetica, sans-serif;
  }
}

/* Custom utility classes */
@layer utilities {
  .glass-panel {
    background-color: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
  }
  
  ..card {
    background-color: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 1rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
  }
  
  ..card:hover {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }
  
  .text-gradient {
    background-clip: text;
    color: transparent;
    background-image: linear-gradient(to right, var(--color-navy-900), var(--color-teal-600));
  }
  
  /* Fallback card style if old components use it */
  .card {
    background-color: var(--color-card);
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }
}
"""
    write_file(f"{base_dir}/src/app/globals.css", css_content)