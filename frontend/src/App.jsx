
import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const emptyForm = {
  title: "",
  description: "",
  category: "",
  status: "Lost",
  location: "",
  date: "",
  contactName: "",
  contactEmail: ""
};

function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // NEW: My Items filter
  const [myItemsOnly, setMyItemsOnly] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");

  // Edit Item state
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(emptyForm);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("campusFindUser") || "null"
      );
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(
    () => localStorage.getItem("campusFindToken") || ""
  );

  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/items`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load items.");
      }

      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.message ||
          "Could not load items. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleAuthChange(event) {
    const { name, value } = event.target;
    setAuthForm((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setMessage("");

    try {
      const endpoint =
        authMode === "login" ? "login" : "register";

      const response = await fetch(
        `${API_URL}/api/auth/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(authForm)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Authentication failed."
        );
      }

      if (authMode === "register") {
        setMessage("Registration successful. Please log in.");
        setAuthMode("login");
        setAuthForm({
          name: "",
          email: authForm.email,
          password: ""
        });
        return;
      }

      if (!data.token || !data.user) {
        throw new Error(
          "Login response did not include a token."
        );
      }

      localStorage.setItem("campusFindToken", data.token);
      localStorage.setItem(
        "campusFindUser",
        JSON.stringify(data.user)
      );

      setToken(data.token);
      setUser(data.user);
      setAuthForm({
        name: "",
        email: "",
        password: ""
      });
      setMyItemsOnly(false);
      setMessage(`Welcome, ${data.user.name}!`);

      await fetchItems();
    } catch (err) {
      setMessage(
        err.message || "Could not connect to the backend."
      );
    }
  }

  function handleLogout() {
    localStorage.removeItem("campusFindToken");
    localStorage.removeItem("campusFindUser");

    setToken("");
    setUser(null);
    setMyItemsOnly(false);
    setEditingId("");
    setEditForm(emptyForm);
    setMessage("You have logged out.");
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setImageFile(null);
      setImagePreview("");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Image size must not exceed 5 MB.");
      event.target.value = "";
      return;
    }
    setMessage("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleEditImageChange(event) {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setEditImageFile(null);
      setEditImagePreview("");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Image size must not exceed 5 MB.");
      event.target.value = "";
      return;
    }
    setMessage("");
    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  async function handleReportSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!token || !user) {
      setMessage("Please log in before reporting an item.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (imageFile) formData.append("image", imageFile);

      const response = await fetch(`${API_URL}/api/items`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        handleLogout();
        setMessage(
          "Your session expired. Please log in again."
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Could not report item."
        );
      }

      setMessage("Item reported successfully!");
      setForm(emptyForm);
      setImageFile(null);
      setImagePreview("");
      await fetchItems();
    } catch (err) {
      setMessage(
        err.message || "Could not report the item."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // EDIT ITEM
  function handleEditClick(item) {
    setEditingId(item._id);

    setEditForm({
      title: item.title || "",
      description: item.description || "",
      category: item.category || "",
      status: item.status || "Lost",
      location: item.location || "",
      date: item.date
        ? String(item.date).slice(0, 10)
        : "",
      contactName: item.contactName || "",
      contactEmail: item.contactEmail || ""
    });
    setEditImageFile(null);
    setEditImagePreview("");

    setMessage("");
  }

  function handleEditChange(event) {
    const { name, value } = event.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  async function handleEditSubmit(event) {
    event.preventDefault();

    if (!token || !user) {
      setMessage("Please log in to edit your item.");
      return;
    }

    setSavingEdit(true);
    setMessage("");

    try {
      const formData = new FormData();
      Object.entries(editForm).forEach(([key, value]) => formData.append(key, value));
      if (editImageFile) formData.append("image", editImageFile);

      const response = await fetch(
        `${API_URL}/api/items/${editingId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        }
      );

      const data = await response.json();

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        handleLogout();
        setMessage(
          "Your session expired. Please log in again."
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Could not update item."
        );
      }

      if (data.item) {
        setItems((previous) =>
          previous.map((item) =>
            item._id === editingId ? data.item : item
          )
        );
      } else {
        await fetchItems();
      }

      setEditingId("");
      setEditForm(emptyForm);
      setEditImageFile(null);
      setEditImagePreview("");
      setMessage("Item updated successfully.");
    } catch (err) {
      setMessage(
        err.message || "Could not update the item."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  // DELETE ITEM
  async function handleDeleteItem(item) {
    if (!token || !user) {
      setMessage("Please log in to delete your item.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.title}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setMessage("");
    setDeletingId(item._id);

    try {
      const response = await fetch(
        `${API_URL}/api/items/${item._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        handleLogout();
        setMessage(
          "Your session expired. Please log in again."
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Could not delete item."
        );
      }

      setItems((previous) =>
        previous.filter(
          (existing) => existing._id !== item._id
        )
      );

      if (editingId === item._id) {
        setEditingId("");
        setEditForm(emptyForm);
      }

      setMessage("Item deleted successfully.");
    } catch (err) {
      setMessage(
        err.message || "Could not delete item."
      );
    } finally {
      setDeletingId("");
    }
  }

  // USER ID used to identify the current user's reports
  const currentUserId =
    user?.id || user?._id || user?.userId;

  // SEARCH + STATUS + MY ITEMS FILTER
  const filteredItems = items.filter((item) => {
    const text = [
      item.title,
      item.description,
      item.category,
      item.location
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = text.includes(
      searchTerm.toLowerCase().trim()
    );

    const matchesStatus =
      statusFilter === "All" ||
      item.status === statusFilter;

    const reportedById =
      typeof item.reportedBy === "object"
        ? item.reportedBy?._id
        : item.reportedBy;

    const matchesMyItems =
      !myItemsOnly ||
      Boolean(
        currentUserId &&
          reportedById &&
          String(currentUserId) === String(reportedById)
      );

    return (
      matchesSearch &&
      matchesStatus &&
      matchesMyItems
    );
  });

  return (
    <>
      <nav className="navbar">
        <a className="brand" href="#home">
          CampusFind
        </a>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#browse">Browse Items</a>
          <a href="#report">Report Item</a>
          <a href="#auth">
            {user ? "My Account" : "Login"}
          </a>
        </div>
      </nav>

      <section className="auth-section" id="auth">
        {user && token ? (
          <div className="auth-card">
            <h2>Welcome, {user.name}!</h2>
            <p>You are logged in to CampusFind.</p>

            <button
              className="btn primary"
              type="button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="auth-card">
            <h2>
              {authMode === "login"
                ? "Login to CampusFind"
                : "Create an Account"}
            </h2>

            <div className="auth-switch">
              <button
                type="button"
                className={
                  authMode === "login" ? "active" : ""
                }
                onClick={() => {
                  setAuthMode("login");
                  setMessage("");
                }}
              >
                Login
              </button>

              <button
                type="button"
                className={
                  authMode === "register" ? "active" : ""
                }
                onClick={() => {
                  setAuthMode("register");
                  setMessage("");
                }}
              >
                Register
              </button>
            </div>

            <form
              onSubmit={handleAuthSubmit}
              className="auth-form"
            >
              {authMode === "register" && (
                <label>
                  Full name
                  <input
                    name="name"
                    value={authForm.name}
                    onChange={handleAuthChange}
                    required
                    maxLength={100}
                    autoComplete="name"
                  />
                </label>
              )}

              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={authForm.email}
                  onChange={handleAuthChange}
                  required
                  autoComplete="email"
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  name="password"
                  value={authForm.password}
                  onChange={handleAuthChange}
                  minLength={8}
                  maxLength={72}
                  required
                  autoComplete={
                    authMode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                />
              </label>

              <button className="btn primary" type="submit">
                {authMode === "login"
                  ? "Login"
                  : "Register"}
              </button>
            </form>

            {message && (
              <p className="form-message" role="status">
                {message}
              </p>
            )}
          </div>
        )}
      </section>

      <main>
        <section className="hero" id="home">
          <p className="tagline">YOUR CAMPUS, CONNECTED</p>
          <h1>Lost something? Let's find it.</h1>

          <p className="hero-text">
            Report lost belongings and help reunite found
            items with their owners across campus.
          </p>

          <div className="hero-buttons">
            <a className="btn primary" href="#browse">
              Browse Items
            </a>
            <a className="btn secondary" href="#report">
              Report an Item
            </a>
          </div>
        </section>

        <section className="search-section" id="browse">
          <h2>Browse Lost and Found Items</h2>
          <p>Search for belongings reported on campus.</p>

          <input
            type="search"
            className="search-input"
            placeholder="Search by item, category, or location..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />

          <div className="filter-buttons">
            {["All", "Lost", "Found"].map((status) => (
              <button
                key={status}
                type="button"
                className={`filter-btn ${
                  statusFilter === status ? "active" : ""
                }`}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}

            {/* NEW: My Items toggle */}
            {user && token && (
              <button
                type="button"
                className={`filter-btn ${
                  myItemsOnly ? "active" : ""
                }`}
                onClick={() =>
                  setMyItemsOnly((previous) => !previous)
                }
              >
                {myItemsOnly
                  ? "Show All Items"
                  : "My Items"}
              </button>
            )}
          </div>

          {myItemsOnly && (
            <p className="status-message">
              Showing only items reported by you.
            </p>
          )}

          {loading ? (
            <p className="status-message">
              Loading items...
            </p>
          ) : error ? (
            <p className="status-message error-message">
              {error}
            </p>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <div className="item-icon">🔎</div>
              <h3>No items found</h3>
              <p>
                {myItemsOnly
                  ? "You have no matching reports. Try changing your filters or report an item."
                  : "Try another search or report a lost or found item."}
              </p>
            </div>
          ) : (
            <div className="items-grid">
              {filteredItems.map((item) => {
                const reportedById =
                  typeof item.reportedBy === "string"
                    ? item.reportedBy
                    : item.reportedBy?._id;

                const isOwner =
                  Boolean(user && token) &&
                  Boolean(reportedById && currentUserId) &&
                  String(reportedById) ===
                    String(currentUserId);

                return (
                  <article
                    className="item-card"
                    key={item._id}
                  >
                    <span
                      className={`item-status ${
                        item.status === "Lost"
                          ? "lost"
                          : "found"
                      }`}
                    >
                      {item.status}
                    </span>

                    {item.imageUrl && (
                      <img
                        className="item-photo"
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                      />
                    )}

                    <h3>{item.title}</h3>
                    <p>{item.description}</p>

                    <p>
                      <strong>Category:</strong>{" "}
                      {item.category}
                    </p>

                    <p>
                      <strong>Location:</strong>{" "}
                      {item.location}
                    </p>

                    <p>
                      <strong>Date:</strong>{" "}
                      {item.date
                        ? String(item.date).slice(0, 10)
                        : "Not specified"}
                    </p>

                    <p>
                      <strong>Contact:</strong>{" "}
                      {item.contactName}
                    </p>

                    <p>
                      <strong>Email:</strong>{" "}
                      <a href={`mailto:${item.contactEmail}`}>
                        {item.contactEmail}
                      </a>
                    </p>

                    {isOwner && (
                      <div className="item-actions">
                        <button
                          type="button"
                          className="btn primary"
                          onClick={() =>
                            handleEditClick(item)
                          }
                          disabled={
                            savingEdit ||
                            Boolean(deletingId)
                          }
                        >
                          Edit Item
                        </button>

                        <button
                          type="button"
                          className="btn delete-btn"
                          onClick={() =>
                            handleDeleteItem(item)
                          }
                          disabled={
                            deletingId === item._id ||
                            savingEdit
                          }
                        >
                          {deletingId === item._id
                            ? "Deleting..."
                            : "Delete Item"}
                        </button>
                      </div>
                    )}

                    {/* Edit form appears inside the selected item card */}
                    {editingId === item._id && (
                      <form
                        className="edit-form"
                        onSubmit={handleEditSubmit}
                      >
                        <h4>Edit Item Details</h4>

                        <label>
                          Item title
                          <input
                            name="title"
                            value={editForm.title}
                            onChange={handleEditChange}
                            required
                            maxLength={120}
                          />
                        </label>

                        <label>
                          Category
                          <select
                            name="category"
                            value={editForm.category}
                            onChange={handleEditChange}
                            required
                          >
                            <option value="">
                              Select category
                            </option>
                            <option>Electronics</option>
                            <option>Books and Notes</option>
                            <option>Identity Cards</option>
                            <option>Keys</option>
                            <option>Bags</option>
                            <option>Clothing</option>
                            <option>Accessories</option>
                            <option>Other</option>
                          </select>
                        </label>

                        <label>
                          Status
                          <select
                            name="status"
                            value={editForm.status}
                            onChange={handleEditChange}
                            required
                          >
                            <option value="Lost">Lost</option>
                            <option value="Found">Found</option>
                          </select>
                        </label>

                        <label>
                          Location
                          <input
                            name="location"
                            value={editForm.location}
                            onChange={handleEditChange}
                            required
                            maxLength={200}
                          />
                        </label>

                        <label>
                          Date
                          <input
                            type="date"
                            name="date"
                            value={editForm.date}
                            onChange={handleEditChange}
                            required
                          />
                        </label>

                        <label>
                          Contact name
                          <input
                            name="contactName"
                            value={editForm.contactName}
                            onChange={handleEditChange}
                            required
                            maxLength={100}
                          />
                        </label>

                        <label>
                          Contact email
                          <input
                            type="email"
                            name="contactEmail"
                            value={editForm.contactEmail}
                            onChange={handleEditChange}
                            required
                          />
                        </label>

                        <label>
                          Replace item photo (optional)
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleEditImageChange}
                          />
                        </label>
                        {(editImagePreview || item.imageUrl) && (
                          <img
                            className="image-preview"
                            src={editImagePreview || item.imageUrl}
                            alt="Item preview"
                          />
                        )}

                        <label>
                          Description
                          <textarea
                            name="description"
                            value={editForm.description}
                            onChange={handleEditChange}
                            rows={4}
                            required
                            maxLength={2000}
                          />
                        </label>

                        <div className="item-actions">
                          <button
                            type="submit"
                            className="btn primary"
                            disabled={savingEdit}
                          >
                            {savingEdit
                              ? "Saving..."
                              : "Save Changes"}
                          </button>

                          <button
                            type="button"
                            className="btn secondary"
                            disabled={savingEdit}
                            onClick={() => {
                              setEditingId("");
                              setEditForm(emptyForm);
                              setEditImageFile(null);
                              setEditImagePreview("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {message && (
            <p className="form-message" role="status">
              {message}
            </p>
          )}
        </section>

        <section className="report-section" id="report">
          <h2>Report a Lost or Found Item</h2>

          <p>
            {user
              ? "Enter the details below to submit your report."
              : "Log in to your account before submitting a report."}
          </p>

          {!user || !token ? (
            <a className="btn primary" href="#auth">
              Login to Report
            </a>
          ) : (
            <form
              className="report-form"
              onSubmit={handleReportSubmit}
            >
              <label>
                Item title
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  required
                  maxLength={120}
                />
              </label>

              <label>
                Category
                <select
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select category</option>
                  <option>Electronics</option>
                  <option>Books and Notes</option>
                  <option>Identity Cards</option>
                  <option>Keys</option>
                  <option>Bags</option>
                  <option>Clothing</option>
                  <option>Accessories</option>
                  <option>Other</option>
                </select>
              </label>

              <label>
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  required
                >
                  <option value="Lost">Lost</option>
                  <option value="Found">Found</option>
                </select>
              </label>

              <label>
                Location
                <input
                  name="location"
                  value={form.location}
                  onChange={handleFormChange}
                  required
                  maxLength={200}
                />
              </label>

              <label>
                Date
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <label>
                Contact name
                <input
                  name="contactName"
                  value={form.contactName}
                  onChange={handleFormChange}
                  required
                  maxLength={100}
                />
              </label>

              <label>
                Contact email
                <input
                  type="email"
                  name="contactEmail"
                  value={form.contactEmail}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <label className="full-width">
                Item photo (optional, JPG/PNG/WebP, max 5 MB)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                />
              </label>
              {imagePreview && (
                <img
                  className="image-preview full-width"
                  src={imagePreview}
                  alt="Selected item preview"
                />
              )}

              <label className="full-width">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={4}
                  required
                  maxLength={2000}
                />
              </label>

              <button
                className="btn primary submit-button"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Report"}
              </button>

              {message && (
                <p
                  className="form-message full-width"
                  role="status"
                >
                  {message}
                </p>
              )}
            </form>
          )}
        </section>
      </main>

      <footer>
        <p>
          © {new Date().getFullYear()} CampusFind.
          Helping reunite lost belongings.
        </p>
      </footer>
    </>
  );
}

export default App;
