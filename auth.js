
import { supabase } from "./supabase.js";

/* =================================
   ZUNE AUTHENTICATION
================================= */

// SIGN UP

export async function registerCustomer(customer) {
  const {
    firstName,
    middleName,
    lastName,
    phone,
    email,
    password
  } = customer;

  const fullName = [
    firstName,
    middleName,
    lastName
  ].join(" ").trim();

  const redirectURL = new URL(
    "./",
    window.location.href
  ).href;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,

    options: {
      emailRedirectTo: redirectURL,

      data: {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        full_name: fullName,
        phone: phone,
        account_type: "buyer"
      }
    }
  });

  if (error) {
    throw error;
  }

  return data;
}


// LOGIN

export async function loginCustomer(email, password) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

  if (error) {
    throw error;
  }

  return data;
}


// FORGOT PASSWORD

export async function recoverPassword(email) {
  const redirectURL = new URL(
    "./",
    window.location.href
  ).href;

  const { data, error } =
    await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: redirectURL
      }
    );

  if (error) {
    throw error;
  }

  return data;
}


// GET CURRENT SESSION

export async function getCustomerSession() {
  const { data, error } =
    await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}


// GET CURRENT CUSTOMER

export async function getCurrentCustomer() {
  const { data, error } =
    await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user;
}


// LOGOUT

export async function logoutCustomer() {
  const { error } =
    await supabase.auth.signOut({ scope: "local" });

  if (error) {
    throw error;
  }
}


// AUTHENTICATION LISTENER

export function listenToAuthChanges(callback) {
  return supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(event, session);
    }
  );
}
