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

type CartItem = {
	product: Product;
	quantity: number;
};

const cart: CartItem[] = [];

const cartSection = document.createElement('section');
cartSection.className = 'cart';
cartSection.setAttribute('aria-labelledby', 'cart-heading');

const cartHeading = document.createElement('h2');
cartHeading.id = 'cart-heading';
cartHeading.className = 'cart__heading';
cartHeading.textContent = 'Warenkorb';
cartHeading.tabIndex = -1;

const cartEmpty = document.createElement('p');
cartEmpty.textContent = 'Dein Warenkorb ist leer.';

const cartList = document.createElement('ul');
cartList.className = 'cart__list';

const cartTotal = document.createElement('p');
cartTotal.className = 'cart__total';

cartSection.append(cartHeading, cartEmpty, cartList, cartTotal);
root.append(cartSection);

function renderCart(): void {
	const rows = cart.map((item) => {
		const row = document.createElement('li');
		row.className = 'cart__item';

		const description = document.createElement('span');
		description.className = 'cart__description';

		const unitPriceInCents = Math.round(item.product.price * 100);
		const itemTotalInCents = unitPriceInCents * item.quantity;

		description.textContent =
			`${item.quantity} × ${item.product.title} – ` +
			priceFormatter.format(itemTotalInCents / 100);

		const removeButton = document.createElement('button');
		removeButton.type = 'button';
		removeButton.className = 'cart__remove';
		removeButton.textContent = 'Entfernen';
		removeButton.setAttribute(
			'aria-label',
			`${item.product.title} vollständig aus dem Warenkorb entfernen`,
		);

		removeButton.addEventListener('click', () => {
			removeFromCart(item.product.id);
		});

		row.append(description, removeButton);

		return row;
	});

	cartList.replaceChildren(...rows);

	const totalInCents = cart.reduce(
		(total, item) =>
			total + Math.round(item.product.price * 100) * item.quantity,
		0,
	);

	cartEmpty.hidden = cart.length > 0;
	cartList.hidden = cart.length === 0;
	cartTotal.hidden = cart.length === 0;
	cartTotal.textContent = `Gesamt: ${priceFormatter.format(totalInCents / 100)}`;
}

function removeFromCart(productId: number): void {
	const index = cart.findIndex((item) => item.product.id === productId);
	const item = cart[index];

	if (!item) {
		throw new Error(`Artikel ${productId} ist nicht im Warenkorb.`);
	}

	cart.splice(index, 1);
	renderCart();

	cartHeading.focus();

	status.textContent = `${item.product.title} wurde aus dem Warenkorb entfernt.`;
}

function addToCart(product: Product): void {
	const existingItem = cart.find((item) => item.product.id === product.id);

	if (existingItem) {
		existingItem.quantity += 1;
	} else {
		cart.push({
			product,
			quantity: 1,
		});
	}
	renderCart();

	const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0);

	status.textContent =
		`${product.title} wurde hinzugefügt. ` +
		`Artikel im Warenkorb: ${totalQuantity}.`;
}

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

	const buyButton = document.createElement('button');
	buyButton.type = 'button';
	buyButton.className = 'product__buy';
	buyButton.textContent = 'In den Warenkorb';
	buyButton.setAttribute('aria-label', `${product.title} in den Warenkorb`);

	buyButton.addEventListener('click', () => {
		addToCart(product);
	});

	card.append(image, title, price, buyButton);

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

renderCart();
void loadProducts(status, categoryNav);
