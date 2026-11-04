import {
	type CartItem,
	CartSchema,
	type Product,
	ProductsSchema,
} from './types';

const root = document.querySelector<HTMLElement>('#root');

if (!root) {
	throw new Error('Das Element #root wurde nicht gefunden.');
}

const categoryNav = document.querySelector<HTMLElement>('#categories');

if (!categoryNav) {
	throw new Error('Die Kategorienavigation wurde nicht gefunden.');
}

// Ohne Kategorieparameter liefert get() null: Dann werden alle Produkte angezeigt.
const selectedCategory = new URLSearchParams(window.location.search).get(
	'category',
);

const status = document.createElement('p');
// Statusänderungen können von Screenreadern angekündigt werden.
status.setAttribute('role', 'status');

const productList = document.createElement('div');
productList.className = 'products';

root.append(status, productList);

const priceFormatter = new Intl.NumberFormat('de-DE', {
	style: 'currency',
	currency: 'USD',
});

// Dieses Array ist die Datenquelle; die Warenkorbanzeige wird daraus neu aufgebaut.
const cart: CartItem[] = [];

const cartSection = document.createElement('section');
cartSection.className = 'cart';
cartSection.setAttribute('aria-labelledby', 'cart-heading');

const cartHeading = document.createElement('h2');
cartHeading.id = 'cart-heading';
cartHeading.className = 'cart__heading';
cartHeading.textContent = 'Warenkorb';
// Nach dem Entfernen per Code fokussierbar, aber kein zusätzlicher Tab-Stopp.
cartHeading.tabIndex = -1;

const cartEmpty = document.createElement('p');
cartEmpty.textContent = 'Dein Warenkorb ist leer.';

const cartList = document.createElement('ul');
cartList.className = 'cart__list';

const cartTotal = document.createElement('p');
cartTotal.className = 'cart__total';

cartSection.append(cartHeading, cartEmpty, cartList, cartTotal);
const storageMessage = document.createElement('p');
storageMessage.setAttribute('role', 'status');

cartSection.append(storageMessage);
root.append(cartSection);

const CART_STORAGE_KEY = 'webshop-cart-v1';

/**
 * Speichert den Warenkorb als JSON; Speicherfehler werden abgefangen und angezeigt.
 */
function saveCart(): void {
	try {
		const serializedCart = JSON.stringify(cart);

		localStorage.setItem(CART_STORAGE_KEY, serializedCart);
		storageMessage.textContent = '';
	} catch (error) {
		console.error('Warenkorb konnte nicht gespeichert werden:', error);

		storageMessage.textContent =
			'Der Warenkorb konnte nicht gespeichert werden. ' +
			'Deine Änderungen gelten nur bis zum nächsten Seitenwechsel.';
	}
}

/**
 * Liest und prüft den gespeicherten Warenkorb beim Start.
 * Fehler beim Speicherzugriff, JSON-Lesen oder Validieren werden angezeigt.
 */
function restoreCart(): void {
	try {
		const savedCart = localStorage.getItem(CART_STORAGE_KEY);

		if (savedCart === null) {
			return;
		}

		// Auch Browserdaten können verändert sein: Erst nach der Zod-Prüfung vertrauen.
		const data: unknown = JSON.parse(savedCart);
		const result = CartSchema.safeParse(data);

		if (!result.success) {
			throw new Error('Die gespeicherten Warenkorbdaten sind ungültig.', {
				cause: result.error,
			});
		}

		cart.push(...result.data);
	} catch (error) {
		console.error('Warenkorb konnte nicht wiederhergestellt werden:', error);

		storageMessage.textContent =
			'Der gespeicherte Warenkorb konnte nicht geladen werden. ' +
			'Du startest deshalb mit einem leeren Warenkorb.';
	}
}

/**
 * Baut die Warenkorbliste neu auf und aktualisiert Leerzustand und Gesamtpreis.
 */
function renderCart(): void {
	const rows = cart.map((item) => {
		const row = document.createElement('li');
		row.className = 'cart__item';

		const description = document.createElement('span');
		description.className = 'cart__description';

		// Mit ganzen Cent rechnen und erst zur Anzeige in Dollar zurückwandeln.
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

/**
 * Entfernt einen gesamten Warenkorbeintrag einschließlich seiner Menge.
 * @param productId - ID des zu entfernenden Produkts.
 * @throws {Error} Wenn die Produkt-ID nicht im Warenkorb vorhanden ist.
 */
function removeFromCart(productId: number): void {
	const index = cart.findIndex((item) => item.product.id === productId);
	const item = cart[index];

	if (!item) {
		throw new Error(`Artikel ${productId} ist nicht im Warenkorb.`);
	}

	cart.splice(index, 1);
	saveCart();
	renderCart();

	// Der angeklickte Button wurde entfernt; der Fokus erhält ein neues Ziel.
	cartHeading.focus();

	status.textContent = `${item.product.title} wurde aus dem Warenkorb entfernt.`;
}

/**
 * Fügt ein Produkt hinzu oder erhöht die Menge eines vorhandenen Eintrags.
 * @param product - Das hinzuzufügende Produkt.
 */
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
	saveCart();
	renderCart();

	const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0);

	status.textContent =
		`${product.title} wurde hinzugefügt. ` +
		`Artikel im Warenkorb: ${totalQuantity}.`;
}

/**
 * Erstellt eine Produktkarte mit Bild, Titel, Preis und Warenkorb-Button.
 * @param product - Geprüfte Produktdaten aus der API.
 * @returns Die fertige Karte zum Einfügen in die Produktliste.
 */
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
		// Die Klickfunktion behält Zugriff auf das Produkt dieser Karte (Closure).
		addToCart(product);
	});

	card.append(image, title, price, buyButton);

	return card;
}

/**
 * Erstellt Kategorie-Links aus der vollständigen Produktliste.
 * @param products - Produkte, aus denen die Kategorien ermittelt werden.
 * @param container - Navigationselement, dessen Inhalt ersetzt wird.
 */
function renderCategories(products: Product[], container: HTMLElement): void {
	// Set entfernt doppelte Kategorien; die Spread-Syntax erzeugt daraus ein Array.
	const categories = [...new Set(products.map((product) => product.category))];

	const list = document.createElement('ul');
	list.className = 'category-nav__list';

	/**
	 * Ergänzt einen Link und kennzeichnet die aktuelle Kategorie.
	 * @param label - Sichtbare Beschriftung des Links.
	 * @param category - API-Kategorie oder null für alle Produkte.
	 * @example addLink('Alle Produkte', null);
	 * @example addLink('Elektronik', 'electronics');
	 */
	function addLink(label: string, category: string | null): void {
		const item = document.createElement('li');
		item.className = 'category-nav__item';

		const link = document.createElement('a');
		link.className = 'category-nav__link';
		link.textContent = label;

		// searchParams kodiert Sonderzeichen und erhält andere URL-Parameter.
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

/**
 * Lädt und prüft Produkte und zeigt die zur URL-Kategorie passenden Karten an.
 * Netzwerk-, HTTP- und Validierungsfehler werden abgefangen und angezeigt.
 * @param statusElement - Textfeld für Ladezustand, Ergebnis oder Fehlermeldung.
 * @param navigationElement - Container für die Kategorie-Links.
 */
async function loadProducts(
	statusElement: HTMLParagraphElement,
	navigationElement: HTMLElement,
): Promise<void> {
	statusElement.textContent = 'Produkte werden geladen …';

	try {
		const response = await fetch('https://fakestoreapi.com/products');

		// fetch wirft bei HTTP-Fehlern wie 404 nicht selbst: Status explizit prüfen.
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

// Gespeicherte Daten zuerst wiederherstellen, damit die erste Anzeige stimmt.
restoreCart();
renderCart();
// Die asynchrone Funktion behandelt ihre Ladefehler selbst.
void loadProducts(status, categoryNav);
