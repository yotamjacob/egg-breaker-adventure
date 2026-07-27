package com.eggbreakeradventures.app;


/** TrustedWebActivityService used for notification delegation.
 *  The Digital Goods request handler was removed in v2.7.0 along with
 *  com.google.androidbrowserhelper:billing (which pinned Billing Library 7.1.1);
 *  purchases run through AndroidBridge.purchaseProduct() in MainActivity instead. */
public class DelegationService extends
        com.google.androidbrowserhelper.trusted.DelegationService {
}
