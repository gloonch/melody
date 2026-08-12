export const PRODUCT_FILTER_GROUPS = [
  {
    key: "techniques",
    hashKey: "technique",
    label: "تکنیک",
    options: [
      { value: "kerisheh", label: "کریشه" },
      { value: "fashion", label: "فشن" },
      { value: "stumpwork", label: "استامپ‌ورک" },
      { value: "classic", label: "کلاسیک" },
      { value: "three_dimensional", hashValue: "three-dimensional", label: "سه‌بعدی" },
    ],
  },
  {
    key: "materials",
    hashKey: "material",
    label: "جنس",
    options: [
      { value: "chiffon", label: "حریر" },
      { value: "satin", label: "ساتن" },
      { value: "organza", label: "ارگانزا" },
      { value: "velvet", label: "مخمل" },
      { value: "tulle", label: "تور" },
      { value: "crepe", label: "کرپ" },
      { value: "mixed", label: "ترکیبی" },
    ],
  },
  {
    key: "sizes",
    hashKey: "size",
    label: "اندازه",
    options: [
      { value: "small", label: "کوچک" },
      { value: "medium", label: "متوسط" },
      { value: "large", label: "بزرگ" },
      { value: "extra_large", hashValue: "extra-large", label: "خیلی بزرگ" },
    ],
  },
  {
    key: "useCases",
    hashKey: "use",
    label: "کاربرد",
    options: [
      { value: "evening_dress", hashValue: "evening-dress", label: "لباس مجلسی" },
      { value: "wedding_dress", hashValue: "wedding-dress", label: "لباس عروس و عقد" },
      { value: "coat_manto", hashValue: "coat-manto", label: "کت و مانتو" },
      { value: "hat", label: "کلاه" },
      { value: "hair_accessory", hashValue: "hair-accessory", label: "اکسسوری مو" },
      { value: "multipurpose", label: "چندمنظوره" },
    ],
  },
];

const PRODUCT_COLOR_LABELS = {
  white: "سفید",
  black: "مشکی",
  cream: "کرم",
  ivory: "شیری",
  pink: "صورتی",
  red: "قرمز",
  blue: "آبی",
  green: "سبز",
  gold: "طلایی",
  silver: "نقره‌ای",
  purple: "بنفش",
  multicolor: "چندرنگ",
};

export const PRODUCT_LABELS = {
  ...Object.fromEntries(
    PRODUCT_FILTER_GROUPS.map((group) => [
      group.key,
      Object.fromEntries(group.options.map((option) => [option.value, option.label])),
    ]),
  ),
  colors: PRODUCT_COLOR_LABELS,
};

const PRODUCT_SEARCH_ALIASES = {
  evening_dress: "لباس مجلسی لباس شب مهمانی",
  wedding_dress: "لباس عروس عقد نامزدی",
  coat_manto: "کت مانتو",
  hat: "کلاه",
  hair_accessory: "اکسسوری مو گل سر",
  multipurpose: "چندمنظوره چند منظوره",
  kerisheh: "کریشه گل حجیم",
  fashion: "فشن ژورنالی",
  stumpwork: "استامپ ورک گلدوزی برجسته",
  classic: "کلاسیک",
  three_dimensional: "سه بعدی سه‌بعدی برجسته",
};

export const EMPTY_PRODUCT_FILTERS = {
  query: "",
  useCases: [],
  techniques: [],
  materials: [],
  sizes: [],
};

export function productSizeBucket(diameterCm) {
  const diameter = Number(diameterCm);
  if (!(diameter > 0)) return "";
  if (diameter < 8) return "small";
  if (diameter < 15) return "medium";
  if (diameter <= 25) return "large";
  return "extra_large";
}

export function formatProductDiameter(diameterCm) {
  const diameter = Number(diameterCm);
  if (!(diameter > 0)) return "";
  return `قطر ${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(diameter)} سانتی‌متر`;
}

export function productLabels(product, field, limit = Infinity) {
  const values = field === "sizes"
    ? [productSizeBucket(product.diameterCm)].filter(Boolean)
    : (product?.[field] || []);
  return values.map((value) => PRODUCT_LABELS[field]?.[value]).filter(Boolean).slice(0, limit);
}

export function normalizePersianSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/ـ/g, "")
    .replace(/[‌‍]/g, " ")
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit).toString())
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit).toString())
    .replace(/\s+/g, " ")
    .trim();
}

export function productMatchesFilters(product, filters, ignoredGroup = "") {
  if (ignoredGroup !== "query" && filters.query) {
    const labels = PRODUCT_FILTER_GROUPS.flatMap((group) => productLabels(product, group.key));
    const taxonomyValues = PRODUCT_FILTER_GROUPS.flatMap((group) => (
      group.key === "sizes" ? [] : (product[group.key] || [])
    ));
    const haystack = normalizePersianSearch([
      product.title,
      product.shortDescription,
      product.description,
      product.usageLabel,
      product.category,
      ...(product.materials || []),
      ...(product.colors || []),
      ...labels,
      ...taxonomyValues.map((value) => PRODUCT_SEARCH_ALIASES[value] || ""),
    ].join(" "));
    const terms = normalizePersianSearch(filters.query).split(" ").filter(Boolean);
    if (!terms.every((term) => haystack.includes(term))) return false;
  }

  return PRODUCT_FILTER_GROUPS.every((group) => {
    if (group.key === ignoredGroup || !filters[group.key]?.length) return true;
    const productValues = group.key === "sizes"
      ? [productSizeBucket(product.diameterCm)].filter(Boolean)
      : (product[group.key] || []);
    return filters[group.key].some((value) => productValues.includes(value));
  });
}

export function parseProductFilterHash(hash) {
  const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  const filters = { ...EMPTY_PRODUCT_FILTERS };
  filters.query = params.get("q") || "";
  PRODUCT_FILTER_GROUPS.forEach((group) => {
    const valuesByHash = new Map();
    group.options.forEach((option) => {
      valuesByHash.set(option.hashValue || option.value, option.value);
      valuesByHash.set(option.value, option.value);
    });
    filters[group.key] = [...new Set((params.get(group.hashKey) || "")
      .split(",")
      .map((value) => valuesByHash.get(value))
      .filter(Boolean))];
  });
  return filters;
}

export function serializeProductFilterHash(filters) {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  PRODUCT_FILTER_GROUPS.forEach((group) => {
    if (!filters[group.key]?.length) return;
    const hashValues = new Map(group.options.map((option) => [option.value, option.hashValue || option.value]));
    params.set(group.hashKey, filters[group.key].map((value) => hashValues.get(value)).filter(Boolean).join(","));
  });
  const value = params.toString();
  return value ? `#${value}` : "";
}
