# **App Name**: HuskTrack

## Core Features:

- User Authentication and Roles: Secure unified login for Admin, Manager, and Employee roles with email/password and Google login integration, using Spring Security for role-based access control.
- Client Management: Add, update, and delete clients; store client details (purchase history, contact info, export preferences); enable search and filtering.
- Stock Management: Add and update stock for Coco Pith, Coir Fiber, and Coconut Husk Chips; track quantity, cost price, selling price, and total stock; auto-update stock after each transaction.
- Finance Management: Track daily income and expenses, calculate profit/loss automatically; compare sales using Chart.js graphs (bar/line charts); export reports to PDF or Excel.
- Receipt System: Generate printable receipts for purchases and sales/export orders, including necessary details. Store each receipt record in the database; allow reprint or email.
- Export Management: Record international buyer details (company name, country, port, contact). Generate export invoices and compare export vs local sales.
- Dashboard Reports and Comparisons: Display key metrics: total revenue, total expenses, top-selling product, and export volume. Compare sales, expenses, and profits between date ranges using Chart.js.  Use tool to create reports based on filters for products, date ranges and clients.

## Style Guidelines:

- Primary color: A deep, earthy brown (#A67B5B) to reflect the natural aspect of coconut husks and create a sense of reliability.
- Background color: A very light beige (#F5F5DC), subtly desaturated to complement the primary color without causing stark contrast, which is gentler on the eyes for extended use.
- Accent color: A muted, desaturated green (#8FBC8F), evoking organic material without literally coding money as green.
- Headline font: 'Playfair' (serif), for an elegant, high-end feel; body font: 'PT Sans' (sans-serif) to pair with Playfair.
- Minimalist icons representing core functions, products, and user roles, ensuring clarity and ease of navigation.
- Clean, minimal layout with intuitive navigation for easy access to key features and data. Use of cards and tables for organized data presentation.
- Subtle animations for loading states and transitions to provide feedback without being distracting.