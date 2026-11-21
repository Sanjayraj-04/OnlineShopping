# ShopEZ Demo Project

## Login flow
- On first load, only the role chooser is visible.
- Customer Login: any non-empty username and password opens only the customer storefront.
- Admin Login: only the configured admin demo credentials open the Admin Dashboard.
- Customer navigation contains Shop, Cart and Logout only.
- Admin navigation contains Dashboard and Logout only.
- Logout returns to the role chooser and hides both role workspaces.

## Firebase
The frontend continues to use the existing Firestore project `shopez-7eaaa` and existing collections. No database replacement is required.

## Critical security note
This is a classroom/demo login only. The admin password is stored in browser JavaScript and can be inspected by anyone who downloads the site. Customer login accepts any non-empty username/password. This is not real authentication or authorization. Public Firestore read/write rules are unsafe for real customer data. Do not deploy publicly or store real personal/payment data until proper authentication and authorization are implemented.
