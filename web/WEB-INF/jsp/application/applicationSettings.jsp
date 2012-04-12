<%--
Copyright (C) 2011 B3Partners B.V.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
--%>

<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@include file="/WEB-INF/jsp/taglibs.jsp"%>

<stripes:layout-render name="/WEB-INF/jsp/templates/ext.jsp">
    <stripes:layout-component name="head">
        <title>Applicatie instellingen</title>
    </stripes:layout-component>
    <stripes:layout-component name="header">
        <jsp:include page="/WEB-INF/jsp/header.jsp"/>
    </stripes:layout-component>
    <stripes:layout-component name="body">
        <div id="content">
        <div id="formcontent">
                <p>
                <stripes:errors/>
                <stripes:messages/>
                <h1 id="headertext">Applicatie instellingen: <c:out value="${actionBean.applicationName}"/></h1>
                </p>
                <stripes:form beanclass="nl.b3p.viewer.admin.stripes.ApplicationSettingsActionBean">
                    <stripes:hidden name="application" value="${actionBean.application}"/>
                <table class="formtable">
                    <tr>
                        <td>Naam:</td>
                        <td><stripes:text name="name" maxlength="255" size="30"/></td>
                        <td rowspan="13" valign="top">Opmerkingen<br><stripes:textarea cols="80" rows="5" name="details['opmerking']" style="margin-top: 5px;" /></td>
                    </tr>
                    <tr>
                        <td>Versie:</td>
                        <td><stripes:text name="version" maxlength="255" size="3"/></td>
                    </tr>
                    <tr>
                        <td>Steunkleur 1 (achtergrond):</td>
                        <td><stripes:text name="details['steunkleur1']" maxlength="255" size="15"/></td>
                    </tr>
                    <tr>
                        <td>Steunkleur 2 (tekstkleur):</td>
                        <td><stripes:text name="details['steunkleur2']" maxlength="255" size="15"/></td>
                    </tr>
                    <tr>
                        <td>Tekst font:</td>
                        <td><stripes:text name="details['font']" maxlength="255" size="30"/></td>
                    </tr>
                    <tr>
                        <td>Spritebestand icoontjes:</td>
                        <td><stripes:text name="details['iconSprite']" maxlength="255" size="60"/></td>
                    </tr>
                    <tr>
                        <td>Stylesheet metadata:</td>
                        <td><stripes:text name="details['stylesheetMetadata']" maxlength="255" size="60"/></td>
                    </tr>
                    <tr>
                        <td>Stylesheet feature info:</td>
                        <td><stripes:text name="details['stylesheetfeatureInfo']" maxlength="255" size="60"/></td>
                    </tr>
                    <tr>
                        <td>Stylesheet printen:</td>
                        <td><stripes:text name="details['stylesheetPrint']" maxlength="255" size="60"/></td>
                    </tr>
                    <tr>
                        <td>Eigenaar:</td>
                        <td><stripes:text name="owner" maxlength="255" size="30"/></td>
                    </tr>
                    <tr>
                        <td>Start extensie:</td>
                        <td>
                            lo-x <stripes:text name="startExtent.minx" maxlength="255" size="8"/>
                            lo-y <stripes:text name="startExtent.miny" maxlength="255" size="8"/>
                            rb-x <stripes:text name="startExtent.maxx" maxlength="255" size="8"/>
                            rb-y <stripes:text name="startExtent.maxy" maxlength="255" size="8"/>
                        </td>
                    </tr>
                    <tr>
                        <td>Maximale extensie:</td>
                        <td>
                            lo-x <stripes:text name="maxExtent.minx" maxlength="255" size="8"/>
                            lo-y <stripes:text name="maxExtent.miny" maxlength="255" size="8"/>
                            rb-x <stripes:text name="maxExtent.maxx" maxlength="255" size="8"/>
                            rb-y <stripes:text name="maxExtent.maxy" maxlength="255" size="8"/>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <stripes:checkbox name="authenticatedRequired"/> Inloggen verplicht
                        </td>
                    </tr>
                </table>
                    
                    <div class="submitbuttons">
                        <stripes:submit name="save" value="Opslaan"/>
                        <stripes:submit name="cancel" value="Annuleren"/>
                        <input type="hidden" name="copy" value="1" disabled="true"/>
                        <input type="button" class="extlikebutton" value="Maak kopie" onclick="return confirmCopy();"/>
                    </div>
                </stripes:form>
            </div>
        </div>
<script type="text/javascript">
    var activelink = 'menu_instellingen';

    function confirmCopy() {
        Ext.MessageBox.show({
            title: 'Applicatie kopiëren',
            msg: 'Naam van kopie:',
            buttons: Ext.MessageBox.OKCANCEL,
            prompt:true,
            value: document.forms[0].name.value + " (kopie)",
            fn: function(btn, text){
                if(btn=='ok' && text){
                    
                    var frm = document.forms[0];
                    
                    frm.name.value = text;
                    frm.copy.disabled = false;
                    
                    frm.submit();
                }
            }
        });  
    }
    Ext.onReady(function() {
        appendPanel('headertext', 'formcontent', 'content');
    });
</script>
    </stripes:layout-component>
</stripes:layout-render>
