import { type Product, ProductsSchema } from './types';

const root = document.querySelector<HTMLElement>('#root');

if (!root) {
	throw new Error('Das Element #root wurde nicht gefunden.');
}

const heading = document.createElement('h1');
heading.textContent = 'Mein Webshop';

const status = document.createElement('p');
status.setAttribute('role', 'status');

const productList = document.createElement('div');
productList.className = 'products';

root.append(heading, status, productList);

const priceFormatter = new Intl.NumberFormat('de-DE', {
	style: 'currency',
	currency: 'USD',
});

function createProductCard(product: Product): HTMLElement {
	const card = document.createElement('article');
	card.className = 'product';

	const image = document.createElement('img');
	image.className = 'product__image';
	image.src = product.image;
	image.alt = product.title;

	const title = document.createElement('h2');
	title.className = 'product__title';
	title.textContent = product.title;

	const price = document.createElement('p');
	price.className = 'product__price';
	price.textContent = priceFormatter.format(product.price);

	card.append(image, title, price);

	return card;
}

async function loadProducts(
	statusElement: HTMLParagraphElement,
): Promise<void> {
	statusElement.textContent = 'Produkte werden geladen …';

	try {
		const response = await fetch('https://fakestoreapi.com/products');

		if (!response.ok) {
			throw new Error(`HTTP-Fehler: ${response.status}`);
		}
		const data: unknown = await response.json();
		const result = ProductsSchema.safeParse(data);

		if (!result.success) {
			throw new Error('Die Produktdaten sind ungültig.', {
				cause: result.error,
			});
		}
		const products = result.data;
		const cards = products.map(createProductCard);

		productList.replaceChildren(...cards);

		statusElement.textContent =
			products.length === 0
				? 'Keine Produkte vorhanden.'
				: `${products.length} Produkte geladen.`;
	} catch (error) {
		console.error('Produkte konnten nicht geladen werden:', error);
		statusElement.textContent =
			'Produkte konnten nicht geladen werden. Bitte versuche es später erneut.';
	}
}

void loadProducts(status);
