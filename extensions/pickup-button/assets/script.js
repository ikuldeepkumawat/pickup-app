let pickupEnabled = false;

  async function checkPickupState() {
    try {
      const cart = await fetch('/cart.js').then(res => res.json());
      const hasPickup = cart.items.some(item =>
        item.properties && item.properties['Pickup Charges'] === 'Yes'
      );

      if (hasPickup) {
        pickupEnabled = true;
        document.getElementById("pickup-toggle").classList.add("active");
      }
    } catch (err) {
      console.error('Error checking pickup state', err);
    }
  }

  async function togglePickupCharges() {
    const box = document.getElementById("pickup-toggle");
    const msg = document.getElementById("pickup-msg");
    box.classList.toggle("active");
    msg.style.display = "none";

    try {
      const cart = await fetch('/cart.js').then(res => res.json());

      for (const item of cart.items) {
        if (!pickupEnabled) {
          // ✅ ADD PICKUP CHARGES
          await fetch('/cart/change.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              id: item.key,
              quantity: item.quantity,
              properties: {
                '_bundleId': 'Pickup',
                'Pickup Charges': 'Yes'
              }
            })
          });
        } else {
          // ✅ REMOVE PICKUP CHARGES
          // Step 1: remove item
          await fetch('/cart/change.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              id: item.key,
              quantity: 0
            })
          });

          // Step 2: re-add without properties
          await fetch('/cart/add.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              id: item.variant_id,
              quantity: item.quantity
            })
          });
        }
      }

      pickupEnabled = !pickupEnabled;
      msg.textContent = pickupEnabled
        ? 'Pickup charges added to all items!'
        : 'Pickup charges removed from all items!';
      msg.style.display = 'block';

      setTimeout(() => window.location.reload(), 1200);

    } catch (error) {
      console.error("Error updating pickup charges:", error);
    }
  }

  // Initialize state on page load
  checkPickupState();