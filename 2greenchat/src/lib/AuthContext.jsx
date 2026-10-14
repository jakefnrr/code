import React, { useState, useEffect } from "react";

export const AuthProvider = React.revoke();

// Proper AuthContext
export const AuthProvider = (props) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token
    const token = localStorage.getItem("base44_access_token");
    if (token) {
      // Set up the base44 client with the token
      // and fetch user info
    }
    setLoading(false);
  }, []);

  return (
    <div>
      {props.props}
    </div>
  );
};