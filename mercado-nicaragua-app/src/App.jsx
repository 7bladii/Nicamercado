import React, { useState, useEffect, createContext, useContext, useRef } from 'react';

// Importaciones de Firebase
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  limit,
} from 'firebase/firestore';

// Se elimina la importación del plugin de la cámara de Capacitor
// import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';


// Contexto para Firebase y usuario
const FirebaseContext = createContext(null);

// Lista de ciudades de Nicaragua (duplicados eliminados)
const nicaraguanCities = [
  "Managua", "León", "Masaya", "Estelí", "Matagalpa", "Chinandega", "Granada",
  "Jinotega", "Nueva Guinea", "Puerto Cabezas", "Juigalpa", "Rivas", "Ocotal",
  "Jalapa",
  "San Carlos", "Bluefields", "Somoto", "Boaco", "Siuna", "Bonanza", "Rosita",
  "Camoapa", "Nagarote", "Diriamba", "Jinotepe", "San Marcos", "Catarina",
  "Niquinohomo", "Masatepe", "La Paz Centro", "Malpaisillo", "Tipitapa", "Ciudad Sandino",
  "El Rama", "Corinto", "El Viejo", "Chichigalpa", "Telica", "Quezalguaque",
  "La Trinidad", "Condega", "Palacagüina", "San Juan del Sur", "Tola", "Belén",
  "Potosí", "Moyogalpa", "Altagracia", "San Jorge", "Cárdenas", "San Rafael del Sur",
  "Villa El Carmen", "El Crucero", "Ticuantepe", "La Concha", "San Juan de Limay",
  "Pueblo Nuevo", "Murra", "Quilalí", "Wiwilí de Jinotega", "San Sebastián de Yalí",
  "La Concordia", "San Rafael del Norte", "Santa María de Pantasma", "El Cuá",
  "San José de Bocay", "Waslala", "Rancho Grande", "Río Blanco", "Mulukukú",
  "Prinzapolka", "Waspán", "Desembocadura de Río Grande",
  "Corn Island", "Pearl Lagoon", "Kukra Hill", "Laguna de Perlas", "Bocana de Paiwas",
  "Santo Domingo", "La Libertad", "San Pedro de Lóvago", "Teustepe", "Santa Lucía",
  "San Lorenzo", "Comalapa", "Cuapa", "San Francisco de Cuapa", "Acoyapa",
  "El Coral", "Morrito", "San Miguelito", "El Castillo", "Solentiname",
  "San Juan de Nicaragua", "San Francisco Libre", "Ciudad Darío", "Terrabona",
  "Esquipulas", "San Isidro", "Sébaco", "San Ramón", "Muy Muy", "La Dalia", "El Tuma - La Dalia",
  "San Dionisio", "San Nicolás", "Santa Rosa del Peñón", "El Sauce", "Achuapa",
  "Larreynaga", "El Jicaral", "Santa Teresa", "Dolores", "San Gregorio", "La Conquista",
  "Nandaime", "Tisma", "Malacatoya",
  "San Juan de Oriente", "La Concepción", "Villa Carlos Fonseca"
];

// Lista de categorías de productos
const productCategories = [
  "Electrónica", "Vehículos", "Motocicletas", "Moda", "Hogar", "Servicios", "Inmuebles",
  "Deportes", "Libros y Revistas", "Mascotas", "Arte y Coleccionables",
  "Juguetes y Juegos", "Música y Películas", "Herramientas", "Otros"
];

// Componente para mostrar notificaciones simuladas
const NotificationBanner = ({ message, type, onClose }) => {
  const bgColor = type === 'success' ? 'bg-green-500' : (type === 'error' ? 'bg-red-500' : 'bg-blue-500');
  const textColor = 'text-white';

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // La notificación desaparece después de 3 segundos
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-0 left-0 right-0 p-3 text-center ${bgColor} ${textColor} text-sm sm:text-base font-semibold shadow-lg z-50 transition-transform duration-300 ease-out transform translate-y-0`}>
      {message}
      <button onClick={onClose} className="ml-4 text-white font-bold">&times;</button>
    </div>
  );
};

// Componente principal de la aplicación
const App = () => {
  const [appInitialized, setAppInitialized] = useState(false);
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);

  // Estado para la notificación simulada
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const showSimulatedNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
  };

  const closeSimulatedNotification = () => {
    setNotification({ ...notification, show: false });
  };

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        // Variables globales proporcionadas por el entorno Canvas
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = typeof __firebase_config !== 'undefined'
          ? JSON.parse(__firebase_config)
          : {};

        if (Object.keys(firebaseConfig).length === 0) {
          console.error("Error: firebaseConfig no está definido. Asegúrate de que __firebase_config esté disponible.");
          return;
        }

        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);

        setAuth(authInstance);
        setDb(dbInstance);

        // Siempre iniciar sesión de forma anónima si no hay un token inicial
        // Esto asegura que siempre tengamos un userId para Firestore
        if (typeof __initial_auth_token !== 'undefined') {
          await signInWithCustomToken(authInstance, __initial_auth_token);
        } else {
          await signInAnonymously(authInstance);
        }

        // Observador de cambios de estado de autenticación
        const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
          if (currentUser) {
            setUser(currentUser);
            setUserId(currentUser.uid);
            console.log("Usuario autenticado:", currentUser.uid);
          } else {
            setUser(null);
            // Si el usuario no está autenticado, genera un ID aleatorio para operaciones anónimas
            // NOTA: En una aplicación real, esto podría manejarse de forma diferente para usuarios no autenticados
            // para asegurar la persistencia de datos anónimos si es necesario.
            setUserId(crypto.randomUUID());
            console.log("Usuario no autenticado. Usando ID aleatorio.");
          }
          setAppInitialized(true); // La inicialización de la app ha terminado
        });

        return () => unsubscribe(); // Limpiar el observador al desmontar
      } catch (error) {
        console.error("Error al inicializar Firebase:", error);
        setAppInitialized(true); // Asegurarse de que la app se inicialice incluso con errores
      }
    };

    initializeFirebase();
  }, []);

  // Muestra un spinner de carga mientras la aplicación se inicializa
  if (!appInitialized) {
    return (
      <div className="flex flex-1 justify-center items-center bg-gray-50 min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
          <p className="mt-4 text-lg text-gray-700">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  return (
    <FirebaseContext.Provider value={{ db, auth, user, userId }}>
      <div className="min-h-screen bg-gray-100 font-sans">
        {notification.show && (
          <NotificationBanner
            message={notification.message}
            type={notification.type}
            onClose={closeSimulatedNotification}
          />
        )}
        <MainApp showSimulatedNotification={showSimulatedNotification} />
      </div>
    </FirebaseContext.Provider>
  );
};

// Componente de la aplicación principal (después de la autenticación)
const MainApp = ({ showSimulatedNotification }) => {
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'jobs' o 'favorites'
  const { auth, userId } = useContext(FirebaseContext);

  // Estados para el chat
  const [showChat, setShowChat] = useState(false);
  const [chatRecipientId, setChatRecipientId] = useState(null);
  const [chatProductName, setChatProductName] = useState(''); // Para mostrar en el título del chat

  // Estados para el formulario de reseña
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewTargetSellerId, setReviewTargetSellerId] = useState(null);
  const [reviewTargetProductId, setReviewTargetProductId] = useState(null);

  // Estado para la configuración de perfil
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  // Estado para la política de privacidad
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("Sesión cerrada exitosamente.");
      showSimulatedNotification("Has cerrado sesión.", "info");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      showSimulatedNotification(`Error al cerrar sesión: ${error.message}`, "error");
    }
  };

  // Función para iniciar un chat con un vendedor
  const handleContactSeller = (sellerId, productName) => {
    setChatRecipientId(sellerId);
    setChatProductName(productName);
    setShowChat(true);
  };

  // Función para abrir el formulario de reseña
  const handleLeaveReview = (sellerId, productId) => {
    setReviewTargetSellerId(sellerId);
    setReviewTargetProductId(productId);
    setShowReviewForm(true);
  };

  return (
    <div className="flex flex-col min-h-screen pt-4 sm:pt-10 bg-gray-100"> {/* Ajuste de padding superior */}
      <div className="bg-blue-600 p-4 sm:p-6 flex flex-col items-center rounded-b-3xl shadow-xl"> {/* Ajuste de padding */}
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Mercado Nicaragua</h1> {/* Ajuste de tamaño de fuente */}
        {/* Mostrar el ID completo del usuario autenticado */}
        {userId && (
          <p className="text-white text-xs sm:text-sm mt-1 mb-2">Tu ID de Usuario: <span className="font-mono break-all">{userId}</span></p>
        )}
        <div className="flex items-center space-x-4 mt-2">
          <button
            className="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold py-1 px-3 sm:py-2 sm:px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            onClick={handleLogout}
          >
            Cerrar Sesión
          </button>
          <button
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold py-1 px-3 sm:py-2 sm:px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            onClick={() => setShowProfileSettings(true)}
          >
            Configuración de Perfil
          </button>
          <button
            className="bg-gray-700 hover:bg-gray-800 text-white text-xs sm:text-sm font-bold py-1 px-3 sm:py-2 sm:px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            onClick={() => setShowPrivacyPolicy(true)}
          >
            Política de Privacidad
          </button>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="flex flex-wrap justify-around bg-white p-2 sm:p-3 rounded-2xl mx-2 sm:mx-4 mt-3 sm:mt-4 shadow-md border-b border-gray-200"> {/* Ajuste de padding y margin, flex-wrap para móviles */}
        <button
          className={`flex-1 py-2 px-3 sm:px-6 rounded-xl text-sm sm:text-lg font-semibold ${activeTab === 'products' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'
            } transition duration-300 ease-in-out`}
          onClick={() => setActiveTab('products')}
        >
          Productos
        </button>
        <button
          className={`flex-1 py-2 px-3 sm:px-6 rounded-xl text-sm sm:text-lg font-semibold ${activeTab === 'jobs' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'
            } transition duration-300 ease-in-out`}
          onClick={() => setActiveTab('jobs')}
        >
          Trabajos
        </button>
        <button
          className={`flex-1 py-2 px-3 sm:px-6 rounded-xl text-sm sm:text-lg font-semibold ${activeTab === 'favorites' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'
            } transition duration-300 ease-in-out`}
          onClick={() => setActiveTab('favorites')}
        >
          Favoritos
        </button>
      </div>

      {/* Contenido principal basado en la pestaña activa */}
      <div className="flex-1 p-2 sm:p-4"> {/* Ajuste de padding */}
        {activeTab === 'products' && (
          <ProductsScreen
            onContactSeller={handleContactSeller}
            onLeaveReview={handleLeaveReview}
            showSimulatedNotification={showSimulatedNotification}
          />
        )}
        {activeTab === 'jobs' && <JobsScreen showSimulatedNotification={showSimulatedNotification} />}
        {activeTab === 'favorites' && (
          <FavoritesScreen
            onContactSeller={handleContactSeller}
            onLeaveReview={handleLeaveReview}
            showSimulatedNotification={showSimulatedNotification}
          />
        )}
      </div>

      {/* Modales condicionales */}
      {showChat && chatRecipientId && (
        <ChatScreen
          recipientId={chatRecipientId}
          productName={chatProductName}
          onCloseChat={() => setShowChat(false)}
          showSimulatedNotification={showSimulatedNotification}
        />
      )}

      {showReviewForm && reviewTargetSellerId && (
        <ReviewForm
          sellerId={reviewTargetSellerId}
          productId={reviewTargetProductId}
          onClose={() => setShowReviewForm(false)}
          showSimulatedNotification={showSimulatedNotification}
        />
      )}

      {showProfileSettings && (
        <ProfileSettingsForm
          onClose={() => setShowProfileSettings(false)}
          showSimulatedNotification={showSimulatedNotification}
        />
      )}

      {showPrivacyPolicy && (
        <PrivacyPolicyScreen
          onClose={() => setShowPrivacyPolicy(false)}
        />
      )}
    </div>
  );
};

// Componente para una tarjeta de producto individual
const ProductCard = ({ item, isFavoriteView, onToggleFavorite, onContactSeller, onLeaveReview }) => {
  const { userId } = useContext(FirebaseContext);
  const isMyProduct = item.userId === userId;

  return (
    <div className="bg-blue-50 p-3 sm:p-4 rounded-xl mb-3 sm:mb-4 shadow-sm border-l-4 border-blue-500 flex flex-col"> {/* Ajuste de padding y margin */}
      {item.imageUrls && item.imageUrls.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2 sm:mb-3">
          {item.imageUrls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`${item.name} - ${index + 1}`}
              className="w-full h-24 object-cover rounded-lg"
              // Fallback para imágenes que no cargan
              onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/100x100/cccccc/333333?text=No+Image`; }}
            />
          ))}
        </div>
      ) : (
        <img
          src={`https://placehold.co/400x200/cccccc/333333?text=No+Image`}
          alt={item.name}
          className="w-full h-40 sm:h-48 object-cover rounded-lg mb-2 sm:mb-3"
        />
      )}
      <h3 className="text-lg sm:text-xl font-bold mb-1 text-gray-800">{item.name}</h3> {/* Ajuste de tamaño de fuente */}
      <p className="text-base sm:text-lg text-green-600 font-bold mb-1">Precio: C${item.price}</p> {/* Ajuste de tamaño de fuente */}
      <p className="text-sm sm:text-base text-gray-700 mb-1">{item.description}</p> {/* Ajuste de tamaño de fuente */}
      <p className="text-sm sm:text-base text-gray-700 mb-1">Categoría: {item.category}</p>
      <p className="text-sm sm:text-base text-gray-700 mb-1">Condición: {item.condition}</p>
      <p className="text-sm sm:text-base text-blue-600 italic mb-1">Contacto: {item.contact}</p>
      <p className="text-sm sm:text-base text-gray-700 mb-1">Ciudad: {item.city}</p>
      {/* Mostrar ID de usuario truncado */}
      <p className="text-xs text-gray-500 text-right mt-1 sm:mt-2">Publicado por: {item.userId.substring(0, 8)}...</p>

      <div className="flex justify-between items-center mt-3 sm:mt-4 flex-wrap gap-2"> {/* Ajuste de margin y gap */}
        {!isMyProduct && ( // No mostrar botón de contacto si es mi propio producto
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-lg text-xs sm:text-sm shadow-md transition duration-300 ease-in-out"
            onClick={() => onContactSeller(item.userId, item.name)}
          >
            Contactar Vendedor
          </button>
        )}
        <button
          className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold shadow-md transition duration-300 ease-in-out ${isFavoriteView ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}
          onClick={() => onToggleFavorite(item)}
        >
          {isFavoriteView ? 'Eliminar de Favoritos' : 'Agregar a Favoritos'}
        </button>
        {!isMyProduct && ( // Solo permitir dejar reseña si no es mi producto
          <button
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-3 rounded-lg text-xs sm:text-sm shadow-md transition duration-300 ease-in-out"
            onClick={() => onLeaveReview(item.userId, item.id)}
          >
            Dejar Reseña
          </button>
        )}
      </div>
    </div>
  );
};

// Pantalla de Productos
const ProductsScreen = ({ onContactSeller, onLeaveReview, showSimulatedNotification }) => {
  const { db, userId } = useContext(FirebaseContext);
  const [products, setProducts] = useState([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [smartSearchQuery, setSmartSearchQuery] = useState(''); // Nuevo estado para la búsqueda inteligente
  const [isSmartSearching, setIsSmartSearching] = useState(false); // Nuevo estado para el indicador de carga
  const [filterCity, setFilterCity] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterCondition, setFilterCondition] = useState(''); // 'nuevo', 'usado', ''
  const [favoriteProductIds, setFavoriteProductIds] = useState({}); // Para saber si un producto ya es favorito

  // Cargar productos
  useEffect(() => {
    if (!db || !userId) return;

    // Ruta de la colección para datos públicos de productos
    const productsCollectionRef = collection(db, `artifacts/${__app_id}/public/data/products`);
    // No se usa orderBy aquí, se filtra en el cliente.
    const q = query(productsCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsList);
      setLoading(false);
    }, (error) => {
      console.error("Error al obtener productos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, userId]);

  // Cargar favoritos del usuario para mostrar el estado en los botones
  useEffect(() => {
    if (!db || !userId) return;

    // Ruta de la colección privada de favoritos del usuario
    const favoritesCollectionRef = collection(db, `artifacts/${__app_id}/users/${userId}/favorites`);
    const unsubscribe = onSnapshot(favoritesCollectionRef, (snapshot) => {
      const favIds = {};
      snapshot.docs.forEach(doc => {
        favIds[doc.id] = true; // Usar el ID del producto como clave
      });
      setFavoriteProductIds(favIds);
    }, (error) => {
      console.error("Error al obtener favoritos:", error);
    });

    return () => unsubscribe();
  }, [db, userId]);

  // Función para añadir un nuevo producto
  const handleAddProduct = async (newProduct) => {
    try {
      const productsCollectionRef = collection(db, `artifacts/${__app_id}/public/data/products`);
      await addDoc(productsCollectionRef, {
        ...newProduct,
        userId: userId,
        createdAt: new Date().toISOString(),
      });
      setShowPostForm(false);
      showSimulatedNotification("¡Producto publicado con éxito!", "success");
      console.log("Producto agregado exitosamente.");
    } catch (error) {
      console.error("Error al agregar producto:", error);
      showSimulatedNotification(`Error al publicar producto: ${error.message}`, "error");
    }
  };

  // Función para alternar un producto como favorito
  const handleToggleFavorite = async (product) => {
    if (!db || !userId) {
      console.warn("Usuario no disponible para favoritos.");
      showSimulatedNotification("Necesitas iniciar sesión para gestionar favoritos.", "error");
      return;
    }

    const favoriteDocRef = doc(db, `artifacts/${__app_id}/users/${userId}/favorites`, product.id);

    try {
      if (favoriteProductIds[product.id]) {
        // Ya es favorito, eliminar
        await deleteDoc(favoriteDocRef);
        showSimulatedNotification("Producto eliminado de favoritos.", "info");
        console.log("Producto eliminado de favoritos.");
      } else {
        // No es favorito, agregar
        await setDoc(favoriteDocRef, {
          productId: product.id,
          name: product.name,
          price: product.price,
          description: product.description,
          category: product.category,
          city: product.city,
          condition: product.condition,
          imageUrls: product.imageUrls || [], // Guardar el array de URLs
          addedAt: new Date().toISOString(),
          originalUserId: product.userId, // Guarda el ID del usuario que lo publicó originalmente
        });
        showSimulatedNotification("Producto agregado a favoritos.", "success");
        console.log("Producto agregado a favoritos.");
      }
    } catch (error) {
      console.error("Error al alternar favorito:", error);
      showSimulatedNotification(`Error al gestionar favoritos: ${error.message}`, "error");
    }
  };

  // Función para realizar una búsqueda inteligente usando la API de Gemini
  const handleSmartSearch = async () => {
    if (!smartSearchQuery.trim()) {
      showSimulatedNotification("Por favor, ingresa una consulta para la búsqueda inteligente.", "info");
      return;
    }

    setIsSmartSearching(true);
    showSimulatedNotification("Realizando búsqueda inteligente...", "info");

    // Prompt para la API de Gemini para extraer filtros
    const prompt = `Analiza la siguiente consulta de búsqueda de productos para un mercado en Nicaragua. Extrae las palabras clave, la ciudad (si se especifica y está en la lista de ciudades de Nicaragua), la categoría (si se especifica y está en la lista de categorías de productos), el precio mínimo, el precio máximo y la condición (Nuevo o Usado). Si un campo no se especifica, déjalo como una cadena vacía para strings o null para números.

    Lista de ciudades de Nicaragua: ${nicaraguanCities.join(', ')}
    Lista de categorías de productos: ${productCategories.join(', ')}

    Consulta: "${smartSearchQuery}"

    Formato de salida JSON (asegúrate de que los valores de ciudad y categoría coincidan exactamente con las listas proporcionadas):
    `;

    // Payload para la llamada a la API de Gemini
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            "keywords": { "type": "STRING" },
            "city": { "type": "STRING" },
            "category": { "type": "STRING" },
            "minPrice": { "type": "NUMBER", "nullable": true },
            "maxPrice": { "type": "NUMBER", "nullable": true },
            "condition": { "type": "STRING" }
          },
          "propertyOrdering": ["keywords", "city", "category", "minPrice", "maxPrice", "condition"]
        }
      }
    };

    const apiKey = ""; // Canvas will automatically provide it in runtime
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
        const jsonString = result.candidates[0].content.parts[0].text;
        const parsedFilters = JSON.parse(jsonString);

        // Aplicar los filtros extraídos a los estados del componente
        setSearchTerm(parsedFilters.keywords || '');
        // Validar que la ciudad y categoría extraídas existan en nuestras listas predefinidas
        setFilterCity(nicaraguanCities.includes(parsedFilters.city) ? parsedFilters.city : '');
        setFilterCategory(productCategories.includes(parsedFilters.category) ? parsedFilters.category : '');
        setFilterMinPrice(parsedFilters.minPrice !== null ? String(parsedFilters.minPrice) : '');
        setFilterMaxPrice(parsedFilters.maxPrice !== null ? String(parsedFilters.maxPrice) : '');
        setFilterCondition(['Nuevo', 'Usado'].includes(parsedFilters.condition) ? parsedFilters.condition : '');

        showSimulatedNotification("Filtros aplicados desde búsqueda inteligente.", "success");
      } else {
        showSimulatedNotification("No se pudieron extraer filtros de la consulta. Intenta ser más específico.", "error");
        console.error("Respuesta inesperada de la API de Gemini:", result);
      }
    } catch (error) {
      showSimulatedNotification(`Error en la búsqueda inteligente: ${error.message}`, "error");
      console.error("Error al llamar a la API de Gemini:", error);
    } finally {
      setIsSmartSearching(false);
    }
  };

  // Filtrar productos basados en los estados de búsqueda y filtros
  const filteredProducts = products.filter(product => {
    const matchesSearchTerm = searchTerm === '' ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCity = filterCity === '' || product.city === filterCity;
    const matchesCategory = filterCategory === '' || product.category === filterCategory;
    const matchesCondition = filterCondition === '' || product.condition === filterCondition;

    const price = parseFloat(product.price);
    const matchesMinPrice = filterMinPrice === '' || price >= parseFloat(filterMinPrice);
    const matchesMaxPrice = filterMaxPrice === '' || price <= parseFloat(filterMaxPrice);

    return matchesSearchTerm && matchesCity && matchesCategory && matchesCondition && matchesMinPrice && matchesMaxPrice;
  });

  // Muestra un spinner de carga mientras se obtienen los productos
  if (loading) {
    return (
      <div className="flex flex-1 justify-center items-center bg-white rounded-2xl p-4 shadow-md">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
          <p className="mt-4 text-base text-gray-700">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-white rounded-2xl p-3 sm:p-4 shadow-md"> {/* Ajuste de padding */}
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-800 text-center">Productos en Venta</h2> {/* Ajuste de tamaño de fuente y margin */}
      <button
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-xl self-center mb-4 sm:mb-6 shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
        onClick={() => setShowPostForm(true)}
      >
        Publicar Producto
      </button>

      {showPostForm && (
        <PostProductForm onSubmit={handleAddProduct} onCancel={() => setShowPostForm(false)} showSimulatedNotification={showSimulatedNotification} />
      )}

      {/* Sección de Búsqueda y Filtros */}
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-xl shadow-inner"> {/* Ajuste de padding y margin */}
        <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-gray-700">Búsqueda y Filtros</h3> {/* Ajuste de tamaño de fuente */}

        {/* Búsqueda Inteligente */}
        <div className="mb-4">
          <label htmlFor="smartSearch" className="block text-gray-700 text-sm font-bold mb-2">Búsqueda Inteligente:</label>
          <div className="flex">
            <input
              id="smartSearch"
              className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm sm:text-base"
              placeholder="Ej: 'moto usada en León bajo 1000$' o 'celular nuevo'"
              value={smartSearchQuery}
              onChange={(e) => setSmartSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSmartSearch();
                }
              }}
              disabled={isSmartSearching}
            />
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r-lg shadow-md transition duration-300 ease-in-out text-sm sm:text-base"
              onClick={handleSmartSearch}
              disabled={isSmartSearching}
            >
              {isSmartSearching ? 'Buscando...' : 'Buscar Inteligentemente'}
            </button>
          </div>
        </div>

        {/* Búsqueda manual por texto */}
        <input
          className="w-full p-2 border border-gray-300 rounded-lg mb-2 sm:mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm sm:text-base"
          placeholder="Buscar por nombre o descripción (búsqueda manual)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3"> {/* Ajuste de gap */}
          {/* Selector de ciudad */}
          <select
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm sm:text-base"
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
          >
            <option value="">Filtrar por Ciudad</option>
            {nicaraguanCities.map((cityName) => (
              <option key={cityName} value={cityName}>{cityName}</option>
            ))}
          </select>
          {/* Selector de categoría */}
          <select
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm sm:text-base"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">Filtrar por Categoría</option>
            {productCategories.map((categoryName) => (
              <option key={categoryName} value={categoryName}>{categoryName}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2 sm:mt-3"> {/* Ajuste de gap y margin */}
          {/* Filtro por precio mínimo */}
          <input
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm sm:text-base"
            type="number"
            placeholder="Precio Mínimo"
            value={filterMinPrice}
            onChange={(e) => setFilterMinPrice(e.target.value)}
          />
          {/* Filtro por precio máximo */}
          <input
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm sm:text-base"
            type="number"
            placeholder="Precio Máximo"
            value={filterMaxPrice}
            onChange={(e) => setFilterMaxPrice(e.target.value)}
          />
        </div>
        {/* Filtro por condición (Nuevo/Usado) */}
        <div className="flex items-center mt-2 sm:mt-3 space-x-2 sm:space-x-4 text-sm sm:text-base"> {/* Ajuste de margin, space y tamaño de fuente */}
          <label className="flex items-center">
            <input
              type="radio"
              name="condition"
              value=""
              checked={filterCondition === ''}
              onChange={() => setFilterCondition('')}
              className="mr-1"
            />
            Todos
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="condition"
              value="Nuevo"
              checked={filterCondition === 'Nuevo'}
              onChange={() => setFilterCondition('Nuevo')}
              className="mr-1"
            />
            Nuevo
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="condition"
              value="Usado"
              checked={filterCondition === 'Usado'}
              onChange={() => setFilterCondition('Usado')}
              className="mr-1"
            />
            Usado
          </label>
        </div>
      </div>

      {/* Lista de productos filtrados */}
      {filteredProducts.length === 0 ? (
        <p className="text-base sm:text-lg text-gray-600 text-center italic mt-6 sm:mt-8">No hay productos disponibles con estos filtros. ¡Sé el primero en publicar!</p>
      ) : (
        <div className="overflow-y-auto flex-1">
          {filteredProducts.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              isFavoriteView={favoriteProductIds[item.id]} // Pasa si es favorito
              onToggleFavorite={handleToggleFavorite}
              onContactSeller={onContactSeller} // Pasa la función de contacto
              onLeaveReview={onLeaveReview} // Pasa la función para dejar reseña
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Formulario para publicar un producto
const PostProductForm = ({ onSubmit, onCancel, showSimulatedNotification }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState(''); // Nuevo estado para categoría
  const [condition, setCondition] = useState(''); // Nuevo estado para condición
  const [imageUrls, setImageUrls] = useState([]); // Estado para las imágenes Base64 (array)
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null); // Referencia para el input de archivo
  const MAX_IMAGES = 9; // Máximo número de imágenes permitidas

  // Maneja la selección de archivos de imagen desde la galería
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImageUrls = [...imageUrls];
    let filesProcessed = 0;

    files.forEach(file => {
      if (newImageUrls.length >= MAX_IMAGES) {
        setMessage(`Solo puedes subir un máximo de ${MAX_IMAGES} imágenes.`);
        return;
      }

      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newImageUrls.push(reader.result);
          setImageUrls([...newImageUrls]); // Actualiza el estado con la nueva imagen
          filesProcessed++;
          if (filesProcessed === files.length) {
            setMessage(''); // Limpia el mensaje si todas las imágenes se procesaron
          }
        };
        reader.readAsDataURL(file); // Lee el archivo como una URL de datos (Base64)
      } else {
        setMessage('Por favor, selecciona solo archivos de imagen válidos.');
      }
    });

    // Limpiar el input de archivo para que se pueda seleccionar el mismo archivo de nuevo
    e.target.value = null;
  };

  // Se elimina la función handleTakePhoto
  // const handleTakePhoto = async () => {
  //   if (imageUrls.length >= MAX_IMAGES) {
  //     showSimulatedNotification(`Solo puedes subir un máximo de ${MAX_IMAGES} imágenes.`, 'error');
  //     return;
  //   }
  //   try {
  //     const photo = await Camera.getPhoto({
  //       quality: 90,
  //       allowEditing: false, // Puedes cambiar a true si quieres permitir edición
  //       resultType: CameraResultType.Uri, // Obtener la imagen como URI para mostrarla
  //       source: CameraSource.Camera // Forzar el uso de la cámara
  //     });

  //     if (photo && photo.webPath) {
  //       setImageUrls(prevUrls => [...prevUrls, photo.webPath]);
  //       setMessage('');
  //       showSimulatedNotification("Foto tomada con éxito.", "success");
  //     }
  //   } catch (error) {
  //     console.error("Error al tomar la foto:", error);
  //     showSimulatedNotification(`Error al tomar la foto: ${error.message}`, "error");
  //   }
  // };

  // Maneja la eliminación de una imagen previsualizada
  const handleRemoveImage = (indexToRemove) => {
    setImageUrls(prevUrls => prevUrls.filter((_, index) => index !== indexToRemove));
    setMessage('');
  };

  // Maneja el envío del formulario
  const handleSubmit = () => {
    if (name && price && description && contact && city && category && condition) {
      onSubmit({ name, price, description, contact, city, category, condition, imageUrls });
      setMessage('');
    } else {
      setMessage('Por favor, completa todos los campos obligatorios.');
    }
  };

  return (
    <div className="bg-blue-100 p-4 sm:p-6 rounded-2xl mb-4 sm:mb-6 shadow-lg overflow-y-auto max-h-96"> {/* Ajuste de padding y margin */}
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-5 text-blue-700 text-center">Publicar Nuevo Producto</h2> {/* Ajuste de tamaño de fuente */}
      <input
        className="w-full p-2 sm:p-3 border border-blue-200 rounded-lg mb-2 sm:mb-3 bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
        placeholder="Nombre del Producto"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="w-full p-2 sm:p-3 border border-blue-200 rounded-lg mb-2 sm:mb-3 bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
        placeholder="Precio (C$)"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        type="number"
      />
      <textarea
        className="w-full p-2 sm:p-3 border border-blue-200 rounded-lg mb-2 sm:mb-3 bg-white text-sm sm:text-base h-20 sm:h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
        placeholder="Descripción del Producto"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
      ></textarea>
      <input
        className="w-full p-2 sm:p-3 border border-blue-200 rounded-lg mb-2 sm:mb-3 bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
        placeholder="Información de Contacto (Ej: Teléfono, Email)"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
      />
      {/* Selector de ciudad */}
      <select
        className="w-full p-2 sm:p-3 border border-blue-200 rounded-lg mb-2 sm:mb-3 bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
        value={city}
        onChange={(e) => setCity(e.target.value)}
      >
        <option value="">Selecciona una ciudad</option>
        {nicaraguanCities.map((cityName) => (
          <option key={cityName} value={cityName}>{cityName}</option>
        ))}
      </select>
      {/* Selector de categoría */}
      <select
        className="w-full p-2 sm:p-3 border border-blue-200 rounded-lg mb-2 sm:mb-3 bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="">Selecciona una categoría</option>
        {productCategories.map((categoryName) => (
          <option key={categoryName} value={categoryName}>{categoryName}</option>
        ))}
      </select>
      {/* Selector de condición */}
      <select
        className="w-full p-2 sm:p-3 border border-blue-200 rounded-lg mb-2 sm:mb-3 bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
        value={condition}
        onChange={(e) => setCondition(e.target.value)}
      >
        <option value="">Selecciona la condición</option>
        <option value="Nuevo">Nuevo</option>
        <option value="Usado">Usado</option>
      </select>

      {/* Sección de carga de imagen */}
      <div className="mb-3 sm:mb-4">
        <label htmlFor="imageUpload" className="block text-gray-700 text-sm font-bold mb-2">Imágenes del Producto (máx. {MAX_IMAGES}):</label>
        <input
          type="file"
          id="imageUpload"
          accept="image/*"
          multiple // Permite seleccionar múltiples archivos
          onChange={handleImageChange}
          ref={fileInputRef}
          className="w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />

        {imageUrls.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative">
                <img src={url} alt={`Previsualización ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-600 mt-2 italic">
          Selecciona hasta {MAX_IMAGES} imágenes desde tu galería. En una aplicación real, estas imágenes se subirían a Firebase Storage.
        </p>
      </div>

      {/* Botones de acción del formulario */}
      <button
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-xl w-full mt-3 sm:mt-4 shadow-md transition duration-300 ease-in-out transform hover:scale-105"
        onClick={handleSubmit}
      >
        Publicar
      </button>
      <button
        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-xl w-full mt-2 sm:mt-3 shadow-md transition duration-300 ease-in-out transform hover:scale-105"
        onClick={onCancel}
      >
        Cancelar
      </button>
      {message && <p className="mt-3 sm:mt-4 text-red-600 text-xs sm:text-sm text-center">{message}</p>}
    </div>
  );
};

// Pantalla de Trabajos
const JobsScreen = ({ showSimulatedNotification }) => {
  const { db, userId } = useContext(FirebaseContext);
  const [jobs, setJobs] = useState([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCity, setFilterCity] = useState('');

  useEffect(() => {
    if (!db || !userId) return;

    // Ruta de la colección para datos públicos de trabajos
    const jobsCollectionRef = collection(db, `artifacts/${__app_id}/public/data/jobs`);
    // No se usa orderBy aquí, se filtra en el cliente.
    const q = query(jobsCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setJobs(jobsList);
      setLoading(false);
    }, (error) => {
      console.error("Error al obtener trabajos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, userId]);

  // Función para añadir un nuevo trabajo
  const handleAddJob = async (newJob) => {
    try {
      const jobsCollectionRef = collection(db, `artifacts/${__app_id}/public/data/jobs`);
      await addDoc(jobsCollectionRef, {
        ...newJob,
        userId: userId, // Asociar el trabajo con el ID del usuario
        createdAt: new Date().toISOString(),
      });
      setShowPostForm(false);
      showSimulatedNotification("¡Trabajo publicado con éxito!", "success");
      console.log("Trabajo agregado exitosamente.");
    } catch (error) {
      console.error("Error al agregar trabajo:", error);
      showSimulatedNotification(`Error al publicar trabajo: ${error.message}`, "error");
    }
  };

  // Filtrar trabajos basados en los estados de búsqueda y filtros
  const filteredJobs = jobs.filter(job => {
    const matchesSearchTerm = searchTerm === '' ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCity = filterCity === '' || job.city === filterCity;

    return matchesSearchTerm && matchesCity;
  });

  // Muestra un spinner de carga mientras se obtienen los trabajos
  if (loading) {
    return (
      <div className="flex flex-1 justify-center items-center bg-white rounded-2xl p-4 shadow-md">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
          <p className="mt-4 text-base text-gray-700">Cargando trabajos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-white rounded-2xl p-3 sm:p-4 shadow-md"> {/* Ajuste de padding */}
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-800 text-center">Ofertas de Trabajo</h2> {/* Ajuste de tamaño de fuente y margin */}
      <button
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-xl self-center mb-4 sm:mb-6 shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
        onClick={() => setShowPostForm(true)}
      >
        Publicar Trabajo
      </button>

      {showPostForm && (
        <PostJobForm onSubmit={handleAddJob} onCancel={() => setShowPostForm(false)} />
      )}

      {/* Sección de Búsqueda y Filtros para Trabajos */}
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-xl shadow-inner"> {/* Ajuste de padding y margin */}
        <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-gray-700">Búsqueda y Filtros</h3> {/* Ajuste de tamaño de fuente */}
        <input
          className="w-full p-2 border border-gray-300 rounded-lg mb-2 sm:mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm sm:text-base"
          placeholder="Buscar por título o descripción..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm sm:text-base"
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
        >
          <option value="">Filtrar por Ciudad</option>
          {nicaraguanCities.map((cityName) => (
            <option key={cityName} value={cityName}>{cityName}</option>
          ))}
        </select>
      </div>

      {/* Lista de trabajos filtrados */}
      {filteredJobs.length === 0 ? (
        <p className="text-base sm:text-lg text-gray-600 text-center italic mt-6 sm:mt-8">No hay ofertas de trabajo disponibles con estos filtros. ¡Sé el primero en publicar!</p>
      ) : (
        <div className="overflow-y-auto flex-1">
          {filteredJobs.map((item) => (
            <div key={item.id} className="bg-blue-50 p-3 sm:p-4 rounded-xl mb-3 sm:mb-4 shadow-sm border-l-4 border-blue-500"> {/* Ajuste de padding y margin */}
              <h3 className="text-lg sm:text-xl font-bold mb-1 text-gray-800">{item.title}</h3> {/* Ajuste de tamaño de fuente */}
              <p className="text-sm sm:text-base text-gray-700 mb-1">{item.description}</p> {/* Ajuste de tamaño de fuente */}
              <p className="text-sm sm:text-base text-blue-600 italic mb-1">Contacto: {item.contact}</p>
              <p className="text-sm sm:text-base text-gray-700 mb-1">Ciudad: {item.city}</p>
              <p className="text-xs text-gray-500 text-right mt-1 sm:mt-2">Publicado por: {item.userId.substring(0, 8)}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Formulario para publicar un trabajo
const PostJobForm = ({ onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [city, setCity] = useState('');
  const [message, setMessage] = useState('');

  // Maneja el envío del formulario de trabajo
  const handleSubmit = () => {
    if (title && description && contact && city) {
      onSubmit({ title, description, contact, city });
      setMessage('');
    } else {
      setMessage('Por favor, completa todos los campos.');
    }
  };

  return (
    <div className="bg-blue-100 p-4 sm:p-6 rounded-2xl mb-4 sm:mb-6 shadow-lg overflow-y-auto max-h-96"> {/* Ajuste de padding y margin */}
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-5 text-blue-700 text-center">Publicar Nueva Oferta de Trabajo</h2> {/* Ajuste de tamaño de fuente */}
      <input
        className="w-full p-2 sm:p-3 border border-blue-200 rounded-lg mb-2 sm:mb-3 bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
        placeholder="Título del Puesto"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="w-full p-2 sm:p-3 border border-blue-200 rounded-lg mb-2 sm:mb-3 bg-white text-sm sm:text-base h-20 sm:h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
        placeholder="Descripción del Trabajo"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
      ></textarea>
      <input
        className="w-full p-2 sm:p-3 border border-blue-200 rounded-lg mb-2 sm:mb-3 bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
        placeholder="Información de Contacto (Ej: Teléfono, Email)"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
      />
      {/* Selector de ciudad */}
      <select
        className="w-full p-2 sm:p-3 border border-blue-200 rounded-lg mb-2 sm:mb-3 bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
        value={city}
        onChange={(e) => setCity(e.target.value)}
      >
        <option value="">Selecciona una ciudad</option>
        {nicaraguanCities.map((cityName) => (
          <option key={cityName} value={cityName}>{cityName}</option>
        ))}
      </select>
      {/* Botones de acción del formulario */}
      <button
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-xl w-full mt-3 sm:mt-4 shadow-md transition duration-300 ease-in-out transform hover:scale-105"
        onClick={handleSubmit}
      >
        Publicar
      </button>
      <button
        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-xl w-full mt-2 sm:mt-3 shadow-md transition duration-300 ease-in-out transform hover:scale-105"
        onClick={onCancel}
      >
        Cancelar
      </button>
      {message && <p className="mt-3 sm:mt-4 text-red-600 text-xs sm:text-sm text-center">{message}</p>}
    </div>
  );
};

// Nueva pantalla de Favoritos
const FavoritesScreen = ({ onContactSeller, onLeaveReview, showSimulatedNotification }) => {
  const { db, userId } = useContext(FirebaseContext);
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !userId) return;

    // Ruta de la colección privada de favoritos del usuario
    const favoritesCollectionRef = collection(db, `artifacts/${__app_id}/users/${userId}/favorites`);
    // No se usa orderBy aquí, se filtra en el cliente.
    const q = query(favoritesCollectionRef);

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const favsList = [];
      for (const docSnapshot of snapshot.docs) {
        const favData = docSnapshot.data();
        // Por simplicidad, solo usamos los datos guardados en la colección de favoritos
        favsList.push({ id: docSnapshot.id, ...favData, favoriteDocId: docSnapshot.id });
      }
      setFavoriteProducts(favsList);
      setLoading(false);
    }, (error) => {
      console.error("Error al obtener favoritos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, userId]);

  // Función para eliminar un producto de favoritos
  const handleRemoveFavorite = async (favoriteDocId) => {
    if (!db || !userId) return;
    try {
      const favoriteDocRef = doc(db, `artifacts/${__app_id}/users/${userId}/favorites`, favoriteDocId);
      await deleteDoc(favoriteDocRef);
      showSimulatedNotification("Producto eliminado de favoritos.", "info");
      console.log("Producto eliminado de favoritos.");
    } catch (error) {
      console.error("Error al eliminar de favoritos:", error);
      showSimulatedNotification(`Error al eliminar de favoritos: ${error.message}`, "error");
    }
  };

  // Muestra un spinner de carga mientras se obtienen los favoritos
  if (loading) {
    return (
      <div className="flex flex-1 justify-center items-center bg-white rounded-2xl p-4 shadow-md">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
          <p className="mt-4 text-base text-gray-700">Cargando favoritos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-white rounded-2xl p-3 sm:p-4 shadow-md"> {/* Ajuste de padding */}
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-800 text-center">Mis Productos Favoritos</h2> {/* Ajuste de tamaño de fuente y margin */}
      {favoriteProducts.length === 0 ? (
        <p className="text-base sm:text-lg text-gray-600 text-center italic mt-6 sm:mt-8">No tienes productos guardados en favoritos.</p>
      ) : (
        <div className="overflow-y-auto flex-1">
          {favoriteProducts.map((item) => (
            <ProductCard
              key={item.id} // Usar el ID del producto original
              item={item}
              isFavoriteView={true} // Indica que estamos en la vista de favoritos
              onToggleFavorite={() => handleRemoveFavorite(item.favoriteDocId)} // Pasa el ID del documento de favorito
              onContactSeller={onContactSeller} // Pasa la función de contacto
              onLeaveReview={onLeaveReview} // Pasa la función para dejar reseña
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Componente de Chat
const ChatScreen = ({ recipientId, productName, onCloseChat, showSimulatedNotification }) => {
  const { db, userId } = useContext(FirebaseContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Generar un chatId único y consistente para la conversación entre dos usuarios
  // Asegura que el orden de los IDs no afecte el ID del chat
  const chatId = [userId, recipientId].sort().join('_');

  useEffect(() => {
    if (!db || !userId || !recipientId) return;

    const messagesCollectionRef = collection(db, `conversations/${chatId}/messages`);
    // Se elimina orderBy para evitar errores de índice. Los mensajes se ordenarán en el cliente.
    const q = query(messagesCollectionRef, limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Ordenar mensajes por timestamp en el cliente
      const sortedMsgs = msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setMessages(sortedMsgs);
    }, (error) => {
      console.error("Error al obtener mensajes:", error);
    });

    return () => unsubscribe();
  }, [db, userId, recipientId, chatId]);

  // Scroll al final de los mensajes cuando se actualizan
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Función para enviar un mensaje
  const handleSendMessage = async () => {
    if (!db || !userId || !recipientId || newMessage.trim() === '') return;

    try {
      const messagesCollectionRef = collection(db, `conversations/${chatId}/messages`);
      await addDoc(messagesCollectionRef, {
        senderId: userId,
        recipientId: recipientId,
        text: newMessage.trim(),
        timestamp: new Date().toISOString(), // Usar ISO string para consistencia
      });
      setNewMessage('');
      showSimulatedNotification(`Mensaje enviado a ${recipientId.substring(0, 8)}...`, "info");
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      showSimulatedNotification(`Error al enviar mensaje: ${error.message}`, "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-2 sm:p-4"> {/* Ajuste de padding */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg h-5/6 flex flex-col">
        <div className="bg-blue-600 p-3 sm:p-4 rounded-t-xl flex justify-between items-center"> {/* Ajuste de padding */}
          <h2 className="text-lg sm:text-xl font-bold text-white">Chat con {recipientId.substring(0, 8)}... sobre {productName}</h2> {/* Ajuste de tamaño de fuente */}
          <button
            className="text-white text-xl sm:text-2xl font-bold hover:text-gray-200"
            onClick={onCloseChat}
          >
            &times;
          </button>
        </div>
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto flex flex-col-reverse"> {/* Ajuste de padding */}
          <div ref={messagesEndRef} /> {/* Elemento para el scroll */}
          {/* Invertir el orden para que los mensajes más recientes aparezcan abajo */}
          {messages.slice().reverse().map((msg) => (
            <div
              key={msg.id}
              className={`mb-1 sm:mb-2 p-2 sm:p-3 rounded-lg max-w-[80%] text-sm sm:text-base ${ // Ajuste de padding y tamaño de fuente
                msg.senderId === userId
                  ? 'bg-blue-100 self-end text-right'
                  : 'bg-gray-100 self-start text-left'
              }`}
            >
              <p className="text-sm sm:text-base text-gray-800">{msg.text}</p> {/* Ajuste de tamaño de fuente */}
              <p className="text-xs text-gray-500 mt-1">
                {msg.senderId === userId ? 'Tú' : msg.senderId.substring(0, 8)}... - {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
        {/* Campo de entrada de mensaje y botón de envío */}
        <div className="p-3 sm:p-4 border-t border-gray-200 flex"> {/* Ajuste de padding */}
          <input
            type="text"
            className="flex-1 p-2 sm:p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm sm:text-base"
            placeholder="Escribe un mensaje..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 sm:py-3 sm:px-5 rounded-r-lg shadow-md transition duration-300 ease-in-out text-sm sm:text-base"
            onClick={handleSendMessage}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente para el formulario de reseña
const ReviewForm = ({ sellerId, productId, onClose, showSimulatedNotification }) => {
  const { db, userId } = useContext(FirebaseContext);
  const [rating, setRating] = useState(5); // Valor por defecto de 5 estrellas
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Maneja el envío de la reseña
  const handleSubmitReview = async () => {
    if (!db || !userId || !sellerId || !rating) {
      setMessage('Por favor, selecciona una calificación.');
      return;
    }
    if (userId === sellerId) {
      setMessage('No puedes dejar una reseña a ti mismo.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      // Las reseñas se guardan en una subcolección privada del vendedor
      const reviewsCollectionRef = collection(db, `artifacts/${__app_id}/users/${sellerId}/reviews`);
      await addDoc(reviewsCollectionRef, {
        reviewerId: userId,
        rating: parseInt(rating),
        comment: comment.trim(),
        productId: productId || null, // Puede ser nulo si la reseña no es de un producto específico
        timestamp: new Date().toISOString(),
      });
      setMessage('¡Reseña enviada con éxito!');
      showSimulatedNotification(`Reseña enviada a ${sellerId.substring(0, 8)}...`, "success");
      setRating(5);
      setComment('');
      setTimeout(onClose, 1500); // Cerrar el formulario después de un breve mensaje de éxito
    } catch (error) {
      console.error("Error al enviar reseña:", error);
      setMessage(`Error al enviar reseña: ${error.message}`);
      showSimulatedNotification(`Error al enviar reseña: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-2 sm:p-4"> {/* Ajuste de padding */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col p-4 sm:p-6"> {/* Ajuste de padding */}
        <div className="flex justify-between items-center mb-3 sm:mb-4"> {/* Ajuste de margin */}
          <h2 className="text-xl sm:text-2xl font-bold text-blue-700">Dejar Reseña para {sellerId.substring(0, 8)}...</h2> {/* Ajuste de tamaño de fuente */}
          <button
            className="text-gray-600 text-xl sm:text-2xl font-bold hover:text-gray-800"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="mb-3 sm:mb-4"> {/* Ajuste de margin */}
          <label htmlFor="rating" className="block text-gray-700 text-sm font-bold mb-1 sm:mb-2">Calificación:</label> {/* Ajuste de tamaño de fuente y margin */}
          <select
            id="rating"
            className="w-full p-2 sm:p-3 border border-blue-200 rounded-lg bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          >
            <option value="5">5 Estrellas - Excelente</option>
            <option value="4">4 Estrellas - Muy Bueno</option>
            <option value="3">3 Estrellas - Bueno</option>
            <option value="2">2 Estrellas - Regular</option>
            <option value="1">1 Estrella - Malo</option>
          </select>
        </div>

        <div className="mb-3 sm:mb-4"> {/* Ajuste de margin */}
          <label htmlFor="comment" className="block text-gray-700 text-sm font-bold mb-1 sm:mb-2">Comentario (opcional):</label> {/* Ajuste de tamaño de fuente y margin */}
          <textarea
            id="comment"
            className="w-full p-2 sm:p-3 border border-blue-200 rounded-lg bg-white text-sm sm:text-base h-20 sm:h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Escribe tu comentario aquí..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          ></textarea>
        </div>

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-xl w-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm sm:text-base"
          onClick={handleSubmitReview}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enviando...' : 'Enviar Reseña'}
        </button>
        {message && <p className={`mt-3 sm:mt-4 text-xs sm:text-sm text-center ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
      </div>
    </div>
  );
};

// Nuevo componente para la configuración de perfil
const ProfileSettingsForm = ({ onClose, showSimulatedNotification }) => {
  const { db, userId } = useContext(FirebaseContext);
  const [username, setUsername] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carga la información del perfil del usuario al montar el componente
  useEffect(() => {
    const fetchProfile = async () => {
      if (!db || !userId) return;
      try {
        // La información del perfil se guarda en una colección privada del usuario
        const profileDocRef = doc(db, `artifacts/${__app_id}/users/${userId}/profile`, 'userProfile');
        const docSnap = await getDoc(profileDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUsername(data.username || '');
          setContactInfo(data.contactInfo || '');
        }
      } catch (error) {
        console.error("Error al cargar el perfil:", error);
        setMessage("Error al cargar la información del perfil.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [db, userId]);

  // Guarda la información del perfil del usuario
  const handleSaveProfile = async () => {
    if (!db || !userId) return;
    setIsSubmitting(true);
    setMessage('');

    try {
      const profileDocRef = doc(db, `artifacts/${__app_id}/users/${userId}/profile`, 'userProfile');
      await setDoc(profileDocRef, {
        username: username.trim(),
        contactInfo: contactInfo.trim(),
        lastUpdated: new Date().toISOString(),
      }, { merge: true }); // Usar merge para no sobrescribir otros campos si existen
      showSimulatedNotification("Perfil actualizado con éxito.", "success");
      setTimeout(onClose, 1500); // Cerrar el formulario después de un breve mensaje de éxito
    } catch (error) {
      console.error("Error al guardar el perfil:", error);
      setMessage(`Error al guardar el perfil: ${error.message}`);
      showSimulatedNotification(`Error al guardar el perfil: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Muestra un spinner de carga mientras se carga el perfil
  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col p-4 sm:p-6 items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
          <p className="mt-4 text-base text-gray-700">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col p-4 sm:p-6">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-700">Configuración de Perfil</h2>
          <button
            className="text-gray-600 text-xl sm:text-2xl font-bold hover:text-gray-800"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="mb-3 sm:mb-4">
          <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-1 sm:mb-2">Nombre de Usuario:</label>
          <input
            id="username"
            type="text"
            className="w-full p-2 sm:p-3 border border-blue-200 rounded-lg bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Tu nombre de usuario"
          />
        </div>

        <div className="mb-3 sm:mb-4">
          <label htmlFor="contactInfo" className="block text-gray-700 text-sm font-bold mb-1 sm:mb-2">Información de Contacto:</label>
          <textarea
            id="contactInfo"
            className="w-full p-2 sm:p-3 border border-blue-200 rounded-lg bg-white text-sm sm:text-base h-20 sm:h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Tu información de contacto (ej: email, teléfono, redes sociales)"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            rows={4}
          ></textarea>
        </div>

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-xl w-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm sm:text-base"
          onClick={handleSaveProfile}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Perfil'}
        </button>
        <button
          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-xl w-full mt-2 sm:mt-3 shadow-md transition duration-300 ease-in-out transform hover:scale-105"
          onClick={onClose}
        >
          Cancelar
        </button>
        {message && <p className={`mt-3 sm:mt-4 text-xs sm:text-sm text-center ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
      </div>
    </div>
  );
};

// Nuevo componente para la Política de Privacidad
const PrivacyPolicyScreen = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-5/6 flex flex-col p-4 sm:p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-700">Política de Privacidad</h2>
          <button
            className="text-gray-600 text-xl sm:text-2xl font-bold hover:text-gray-800"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2"> {/* Agregado pr-2 para espacio del scrollbar */}
          <p className="mb-4 text-sm sm:text-base text-gray-700">
            En Mercado Nicaragua, nos comprometemos a proteger su privacidad. Esta política de privacidad explica cómo recopilamos, usamos y protegemos su información personal.
          </p>

          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">1. Información que Recopilamos</h3>
          <p className="mb-2 text-sm sm:text-base text-gray-700">
            Recopilamos información que usted nos proporciona directamente, como:
          </p>
          <ul className="list-disc list-inside mb-4 text-sm sm:text-base text-gray-700 ml-4">
            <li>**Información de Perfil:** Nombre de usuario, información de contacto (si la proporciona).</li>
            <li>**Información de Publicación:** Detalles de productos o trabajos que publica (nombre, descripción, precio, categoría, ciudad, condición, imágenes).</li>
            <li>**Mensajes:** Contenido de los mensajes enviados a través de nuestro sistema de chat.</li>
            <li>**Reseñas:** Calificaciones y comentarios que deja sobre otros usuarios o productos.</li>
          </ul>
          <p className="mb-4 text-sm sm:text-base text-gray-700">
            También recopilamos automáticamente cierta información cuando utiliza la aplicación, como su ID de usuario anónimo (para fines de autenticación y datos de usuario privados) y datos de uso de la aplicación.
          </p>

          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">2. Uso de la Información</h3>
          <p className="mb-4 text-sm sm:text-base text-gray-700">
            Utilizamos la información recopilada para:
          </p>
          <ul className="list-disc list-inside mb-4 text-sm sm:text-base text-gray-700 ml-4">
            <li>Facilitar la publicación y búsqueda de productos y trabajos.</li>
            <li>Permitir la comunicación entre usuarios (chat).</li>
            <li>Gestionar sus productos favoritos.</li>
            <li>Mejorar la experiencia del usuario y la funcionalidad de la aplicación.</li>
            <li>Realizar análisis internos y de rendimiento.</li>
          </ul>

          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">3. Compartir Información</h3>
          <p className="mb-4 text-sm sm:text-base text-gray-700">
            No compartimos su información personal con terceros, excepto en las siguientes circunstancias:
          </p>
          <ul className="list-disc list-inside mb-4 text-sm sm:text-base text-gray-700 ml-4">
            <li>Con su consentimiento explícito.</li>
            <li>Para cumplir con obligaciones legales.</li>
            <li>Para proteger los derechos, la propiedad o la seguridad de Mercado Nicaragua, nuestros usuarios o el público.</li>
          </ul>

          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">4. Seguridad de la Información</h3>
          <p className="mb-4 text-sm sm:text-base text-gray-700">
            Implementamos medidas de seguridad razonables para proteger su información personal contra el acceso no autorizado, la alteración, la divulgación o la destrucción. Sin embargo, ninguna transmisión de datos por Internet o sistema de almacenamiento electrónico es 100% segura.
          </p>
          <div className="flex justify-center my-4">
            <img
              src="https://placehold.co/400x200/ADD8E6/000000?text=Seguridad+de+Datos"
              alt="Representación de seguridad de datos"
              className="rounded-lg shadow-md w-full max-w-xs"
            />
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">5. Sus Derechos</h3>
          <p className="mb-4 text-sm sm:text-base text-gray-700">
            Usted tiene derecho a acceder, corregir o eliminar su información personal. Puede gestionar la mayoría de sus datos a través de la sección "Configuración de Perfil" de la aplicación. Para solicitudes adicionales, contáctenos.
          </p>
          <div className="flex justify-center my-4">
            <img
              src="https://placehold.co/400x200/90EE90/000000?text=Control+de+Usuario"
              alt="Representación de control de usuario"
              className="rounded-lg shadow-md w-full max-w-xs"
            />
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">6. Cambios a esta Política</h3>
          <p className="mb-4 text-sm sm:text-base text-gray-700">
            Podemos actualizar esta política de privacidad ocasionalmente. Le notificaremos sobre cualquier cambio publicando la nueva política en esta página. Se le recomienda revisar esta política periódicamente para cualquier cambio.
          </p>

          <p className="text-sm sm:text-base text-gray-600 text-right mt-6">
            Última actualización: 6 de Julio de 2025
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm sm:text-base"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;