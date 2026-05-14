package com.yourname.promptr.billing;

import android.util.Log;

import com.android.billingclient.api.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Capacitor plugin bridging Google Play Billing to the web layer.
 * Supports one-time in-app product purchases for tier upgrades.
 */
@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private static final String TAG = "PlayBilling";
    private BillingClient billingClient;
    private PluginCall pendingCall;

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases()
                .build();

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    Log.i(TAG, "Billing client connected");
                } else {
                    Log.e(TAG, "Billing setup failed: " + billingResult.getDebugMessage());
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                Log.w(TAG, "Billing service disconnected");
            }
        });
    }

    /**
     * Purchase a product by its product ID.
     * Call from JS: PlayBilling.purchase({ productId: 'promptr_creator' })
     */
    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null || productId.isEmpty()) {
            call.reject("productId is required");
            return;
        }

        pendingCall = call;

        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        productList.add(
                QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build()
        );

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK
                    || productDetailsList == null || productDetailsList.isEmpty()) {
                call.reject("Product not found: " + productId);
                pendingCall = null;
                return;
            }

            ProductDetails productDetails = productDetailsList.get(0);

            List<BillingFlowParams.ProductDetailsParams> flowParams = new ArrayList<>();
            flowParams.add(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(productDetails)
                            .build()
            );

            BillingFlowParams billingFlowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(flowParams)
                    .build();

            billingClient.launchBillingFlow(getActivity(), billingFlowParams);
        });
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK
                && purchases != null && !purchases.isEmpty()) {

            Purchase purchase = purchases.get(0);

            // Acknowledge the purchase
            if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                AcknowledgePurchaseParams ackParams = AcknowledgePurchaseParams.newBuilder()
                        .setPurchaseToken(purchase.getPurchaseToken())
                        .build();

                billingClient.acknowledgePurchase(ackParams, ackResult -> {
                    Log.i(TAG, "Purchase acknowledged: " + ackResult.getResponseCode());
                });

                // Return purchase info to JS
                if (pendingCall != null) {
                    JSObject result = new JSObject();
                    result.put("purchaseToken", purchase.getPurchaseToken());
                    result.put("productId", purchase.getProducts().get(0));
                    result.put("orderId", purchase.getOrderId());
                    result.put("purchaseState", purchase.getPurchaseState());
                    pendingCall.resolve(result);
                    pendingCall = null;
                }
            }
        } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            if (pendingCall != null) {
                pendingCall.reject("Purchase cancelled by user");
                pendingCall = null;
            }
        } else {
            if (pendingCall != null) {
                pendingCall.reject("Purchase failed: " + billingResult.getDebugMessage());
                pendingCall = null;
            }
        }
    }
}
