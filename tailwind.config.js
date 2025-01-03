/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        red: {
          50: '#fdf8f6',
          100: '#f5eae3',
          200: '#ecd5c6',
          300: '#e2bfaa',
          400: '#d5a27d',
          500: '#b07c50', // Base brown
          600: '#8e5e3c',
          700: '#6f472d',
          800: '#523420',
          900: '#382414', // Very dark brown
          950: '#25170e', // Nearly black bro
        },
      },
    }, 
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
};
