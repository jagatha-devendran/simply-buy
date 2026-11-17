# Simply Buy — Full-Stack E-Commerce Storefront

A full-stack e-commerce marketplace consisting of a **Spring Boot 3** REST API backend and a **Svelte 5** storefront created using **Antigravity (agy)**.

## Project Structure

```
simply-buy/
├── backend/       # Spring Boot 3 + MySQL REST API
├── src/           # Svelte 5 + Vite storefront (made using agy)
├── index.html
├── package.json
└── vite.config.js
```

## Backend (Spring Boot 3 + MySQL)

The backend engine is engineered with **Java 21** and **Spring Boot 3**:
- **Authentication**: Stateless JWT session authentication with secure `HttpOnly` cookies (`/auth/login`, `/auth/signup`, `/auth/logout`).
- **Catalog & Search**: Autosuggest search, category browsing, product filtering, and product details.
- **Bag & Wishlist**: State management for user carts and saved wishlist items.
- **Orders & Checkout**: Transactional order placement, address management, and Razorpay payment verification.

### Running the Backend

1. Make sure MySQL is running and create the database:
   ```sql
   CREATE DATABASE simply_buy_db;
   ```
2. Copy the example configuration to create your local `application.properties`:
   ```bash
   cp backend/src/main/resources/application.properties.example backend/src/main/resources/application.properties
   ```
   Set your MySQL `spring.datasource.username` and `spring.datasource.password`.
3. Launch the Spring Boot application:
   ```bash
   cd backend
   ./mvnw spring-boot:run     # Starts on http://localhost:8080
   ```

---

## Frontend (Svelte 5)

The storefront is built in **Svelte 5** using **agy** (Antigravity):
- **Dynamic Catalogue**: Automatic multi-photo carousel on product tile hover.
- **Product Detail**: Responsive layout, zoomable gallery, size picker, and delivery estimation.
- **Bag & Checkout**: Slide-over cart drawer with live calculations, promo coupons, and multi-option payment modal.
- **Wishlist**: Real-time bookmarking and saved collections.

### Running the Frontend

```bash
npm install
npm run dev                # Starts on http://localhost:5173
```

Vite proxies `/auth` and `/gateway` directly to the Spring Boot backend on `:8080`.
