import { type Product, ProductsSchema } from './types';

const root = document.querySelector<HTMLElement>('#root');

if (!root) {
	throw new Error('Das Element #root wurde nicht gefunden.');
}

const categoryNav = document.querySelector<HTMLElement>('#categories');

if (!categoryNav) {
	throw new Error('Die Kategorienavigation wurde nicht gefunden.');
}

const selectedCategory = new URLSearchParams(window.location.search).get(
	'category',
);

const status = document.createElement('p');
status.setAttribute('role', 'status');

const productList = document.createElement('div');
productList.className = 'products';

root.append(status, productList);

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

function renderCategories(products: Product[], container: HTMLElement): void {
	const categories = [...new Set(products.map((product) => product.category))];

	const list = document.createElement('ul');
	list.className = 'category-nav__list';

	function addLink(label: string, category: string | null): void {
		const item = document.createElement('li');
		item.className = 'category-nav__item';

		const link = document.createElement('a');
		link.className = 'category-nav__link';
		link.textContent = label;

		const url = new URL(window.location.href);

		if (category === null) {
			url.searchParams.delete('category');
		} else {
			url.searchParams.set('category', category);
		}

		link.href = url.href;

		if (selectedCategory === category) {
			link.setAttribute('aria-current', 'page');
		}

		item.append(link);
		list.append(item);
	}

	addLink('Alle Produkte', null);

	for (const category of categories) {
		addLink(category, category);
	}

	container.replaceChildren(list);
}

async function loadProducts(
	statusElement: HTMLParagraphElement,
	navigationElement: HTMLElement,
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

		renderCategories(products, navigationElement);

		const filteredProducts =
			selectedCategory === null
				? products
				: products.filter((product) => product.category === selectedCategory);

		const cards = filteredProducts.map(createProductCard);

		productList.replaceChildren(...cards);

		statusElement.textContent =
			filteredProducts.length === 0
				? 'Keine Produkte für diese Auswahl gefunden.'
				: `${filteredProducts.length} Produkte angezeigt.`;
	} catch (error) {
		console.error('Produkte konnten nicht geladen werden:', error);
		statusElement.textContent =
			'Produkte konnten nicht geladen werden. Bitte versuche es später erneut.';
	}
}

void loadProducts(status, categoryNav);
