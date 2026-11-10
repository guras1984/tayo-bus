package kr.kj.tayo;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
import android.view.View;
import android.widget.*;

/** A small installed app. Transit credentials and data requests remain on the server. */
public final class MainActivity extends Activity {
    private static final String ORIGIN="https://daejeon-tayo-kj.kjshin841.chatgpt.site";
    private WebView web;
    private LinearLayout errorView;
    private GeolocationPermissions.Callback locationCallback;
    private String locationOrigin;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root=new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(246,251,254));
        web=new WebView(this);web.setBackgroundColor(Color.rgb(246,251,254));
        root.addView(web,new FrameLayout.LayoutParams(-1,-1));
        errorView=new LinearLayout(this);errorView.setOrientation(LinearLayout.VERTICAL);
        errorView.setGravity(android.view.Gravity.CENTER);errorView.setPadding(32,32,32,32);
        TextView message=new TextView(this);message.setText("인터넷 연결을 확인해주세요.\n연결되면 최신 버스 정보를 불러올 수 있어요.");message.setGravity(android.view.Gravity.CENTER);message.setTextColor(Color.rgb(36,61,80));message.setTextSize(16);
        Button retry=new Button(this);retry.setText("다시 열기");retry.setOnClickListener(v->{errorView.setVisibility(View.GONE);web.setVisibility(View.VISIBLE);web.loadUrl(ORIGIN+"/");});
        errorView.addView(message);errorView.addView(retry);errorView.setVisibility(View.GONE);root.addView(errorView,new FrameLayout.LayoutParams(-1,-1));setContentView(root);
        root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets.consumeSystemWindowInsets();});
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(true);settings.setUserAgentString(settings.getUserAgentString()+" TayoAndroid/1.0.0");
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();
                if(sameOrigin(uri)&&!uri.getPath().endsWith(".apk"))return false;
                if(request.isForMainFrame())openExternal(uri);return true;
            }
            @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame()){web.setVisibility(View.GONE);errorView.setVisibility(View.VISIBLE);}}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback){
                if(!ORIGIN.equals(origin)){callback.invoke(origin,false,false);return;}
                if(hasLocation()){callback.invoke(origin,true,false);return;}
                if(locationCallback!=null)locationCallback.invoke(locationOrigin,false,false);
                locationOrigin=origin;locationCallback=callback;
                requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},7);
            }
        });
        web.setDownloadListener((url,agent,disposition,type,length)->openExternal(Uri.parse(url)));
        if(state==null||web.restoreState(state)==null)web.loadUrl(ORIGIN+"/");
    }
    private boolean sameOrigin(Uri u){return "https".equals(u.getScheme())&&"daejeon-tayo-kj.kjshin841.chatgpt.site".equals(u.getHost())&&(u.getPort()==-1||u.getPort()==443);}
    private boolean hasLocation(){return checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED||checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED;}
    private void openExternal(Uri uri){if(!"https".equals(uri.getScheme())&&!"http".equals(uri.getScheme()))return;try{startActivity(new Intent(Intent.ACTION_VIEW,uri).addCategory(Intent.CATEGORY_BROWSABLE));}catch(ActivityNotFoundException e){Toast.makeText(this,"인터넷 브라우저를 설치해주세요.",Toast.LENGTH_SHORT).show();}}
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results){super.onRequestPermissionsResult(request,permissions,results);if(request==7&&locationCallback!=null){locationCallback.invoke(locationOrigin,hasLocation(),false);locationCallback=null;locationOrigin=null;}}
    @Override public void onBackPressed(){web.evaluateJavascript("(function(){var back=document.querySelector('[aria-label=\"정류장 목록으로\"]');if(back){back.click();return true;}return false;})()",result->{if(!"true".equals(result)){if(web.canGoBack())web.goBack();else super.onBackPressed();}});}
    @Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);web.saveState(state);}
    @Override protected void onResume(){super.onResume();web.onResume();}
    @Override protected void onPause(){web.onPause();super.onPause();}
    @Override protected void onDestroy(){if(locationCallback!=null)locationCallback.invoke(locationOrigin,false,false);web.destroy();super.onDestroy();}
}
