import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DeleteAccountSection() {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const canDelete = confirmText === "DELETE";

  const handleDelete = async () => {
    if (!canDelete) return;

    setLoading(true);

    try {
      const { error } = await supabase.rpc("delete_my_account");

      if (error) throw error;

      await supabase.auth.signOut();

      window.location.href = "/login";
    } catch (err) {
      console.error(err);
      alert("Unable to delete account.");
    }

    setLoading(false);
  };

  return (
    <div className="border border-red-300 rounded-xl p-6 bg-red-50 mt-10">
      <h2 className="text-lg font-semibold text-red-700">
        Delete Account
      </h2>

      <p className="text-sm mt-2 text-gray-700">
        This will permanently delete your Gather account and all data
        associated with it.
      </p>

      <p className="text-sm mt-2">
        Type <strong>DELETE</strong> to confirm.
      </p>

      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="border rounded-md px-3 py-2 mt-3 w-full"
        placeholder="Type DELETE"
      />

      <button
        onClick={handleDelete}
        disabled={!canDelete || loading}
        className="bg-red-600 text-white px-4 py-2 rounded-lg mt-4 disabled:opacity-50"
      >
        {loading ? "Deleting..." : "Delete My Account"}
      </button>
    </div>
  );
}