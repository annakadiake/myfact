import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Alert, Image } from 'react-native';
import jsPDF from 'jspdf';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

export default function App() {
  const [currentView, setCurrentView] = useState('home');

  const showInvoiceForm = () => {
    setCurrentView('create');
  };

  const showHome = () => {
    setCurrentView('home');
  };

  if (currentView === 'home') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.homeBody}>
          <View style={styles.heroCard}>
            <View style={styles.logoCircle}>
              <Image source={require('./assets/myfact.png')} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Text style={styles.welcomeTitle}>Bienvenue!</Text>
            
            <TouchableOpacity 
              style={styles.createButton}
              onPress={showInvoiceForm}
            >
              <Text style={styles.createButtonText}>Créer une facture</Text>
            </TouchableOpacity>
          </View>
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <CreateInvoiceForm onBack={showHome} />
  );
}

function CreateInvoiceForm({ onBack }) {
  const [formData, setFormData] = useState({
    companyName: '',
    address: '',
    phone: '',
    email: '',
    logo: null,
    clientName: '',
    clientAddress: '',
    clientPhone: '',
    clientEmail: '',
    articles: [{ description: '', quantity: '', unitPrice: '', total: '' }],
    tva: 18,
    applyTva: false,
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setFormData({ ...formData, logo: asset.base64 || asset.uri });
    }
  };

  const addArticle = () => {
    setFormData({
      ...formData,
      articles: [...formData.articles, { description: '', quantity: '', unitPrice: '', total: '' }]
    });
  };

  const updateArticle = (index, field, value) => {
    const newArticles = [...formData.articles];
    newArticles[index][field] = value;

    if (field === 'quantity' || field === 'unitPrice') {
      const qty = parseFloat(newArticles[index].quantity) || 0;
      const price = parseFloat(newArticles[index].unitPrice) || 0;
      newArticles[index].total = (qty * price).toString();
    }

    setFormData({ ...formData, articles: newArticles });
  };

  const calculateTotal = () => {
    return formData.articles.reduce((sum, article) => sum + (parseFloat(article.total) || 0), 0);
  };

  const calculateTTC = () => {
    const total = calculateTotal();
    if (formData.applyTva) {
      return total + total * (formData.tva / 100);
    }
    return total;
  };

  const generatePDF = async () => {
    try {
      const doc = new jsPDF();
      
      // Couleurs neutres (noir, gris, blanc)
      const black = [0, 0, 0];
      const darkGray = [64, 64, 64];
      const mediumGray = [128, 128, 128];
      const lightGray = [240, 240, 240];
      const white = [255, 255, 255];
      
      let yPos = 20;
      
      // En-tête blanc
      doc.setFillColor(...white);
      doc.rect(0, 0, 210, 50, 'F');
      
      // Logo
      if (formData.logo) {
        try {
          let logoData = formData.logo;
          if (logoData.startsWith('data:image')) {
            logoData = logoData.split(',')[1];
          }
          doc.addImage(logoData, 'PNG', 15, 10, 30, 30);
        } catch (e) {
          console.error('Erreur logo:', e);
          doc.setFontSize(16);
          doc.setTextColor(...black);
          doc.setFont(undefined, 'bold');
          doc.text('FACTURE', 15, 30);
        }
      } else {
        doc.setFontSize(16);
        doc.setTextColor(...black);
        doc.setFont(undefined, 'bold');
        doc.text('FACTURE', 15, 30);
      }
      
      // Titre FACTURE
      doc.setFontSize(24);
      doc.setTextColor(...black);
      doc.setFont(undefined, 'bold');
      doc.text('FACTURE', 195, 30, { align: 'right' });
      
      // Date
      const date = new Date().toLocaleDateString('fr-FR');
      doc.setFontSize(9);
      doc.setTextColor(...mediumGray);
      doc.setFont(undefined, 'normal');
      doc.text(`Date: ${date}`, 195, 40, { align: 'right' });
      
      // Ligne de séparation
      doc.setDrawColor(...mediumGray);
      doc.setLineWidth(0.5);
      doc.line(15, 50, 195, 50);
      
      // Informations émetteur
      yPos = 70;
      doc.setFillColor(...lightGray);
      doc.rect(15, yPos, 85, 50, 'F');
      
      doc.setTextColor(...black);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('ÉMETTEUR', 20, yPos + 8);
      
      doc.setTextColor(...darkGray);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(formData.companyName || '_________________', 20, yPos + 18);
      doc.text(formData.address || '_________________', 20, yPos + 26);
      doc.text(`Tél: ${formData.phone || '_________________' }`, 20, yPos + 34);
      doc.text(`Email: ${formData.email || '_________________' }`, 20, yPos + 42);
      
      // Informations client
      doc.setFillColor(...lightGray);
      doc.rect(110, yPos, 85, 50, 'F');
      
      doc.setTextColor(...black);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('CLIENT', 115, yPos + 8);
      
      doc.setTextColor(...darkGray);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(formData.clientName || '_________________', 115, yPos + 18);
      doc.text(formData.clientAddress || '_________________', 115, yPos + 26);
      doc.text(`Tél: ${formData.clientPhone || '_________________' }`, 115, yPos + 34);
      doc.text(`Email: ${formData.clientEmail || '_________________' }`, 115, yPos + 42);
      
      // Tableau des articles
      yPos = 135;
      doc.setDrawColor(...mediumGray);
      doc.setLineWidth(0.5);
      doc.line(15, yPos, 195, yPos);
      
      yPos += 10;
      doc.setFillColor(...darkGray);
      doc.rect(15, yPos, 180, 10, 'F');
      
      doc.setTextColor(...white);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('DESCRIPTION', 20, yPos + 7);
      doc.text('QTÉ', 100, yPos + 7);
      doc.text('P.U. (FCFA)', 130, yPos + 7);
      doc.text('TOTAL (FCFA)', 165, yPos + 7);
      
      yPos += 10;
      let rowCount = 0;
      
      formData.articles.forEach((article, index) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
          
          doc.setFillColor(...darkGray);
          doc.rect(15, yPos, 180, 10, 'F');
          doc.setTextColor(...white);
          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.text('DESCRIPTION', 20, yPos + 7);
          doc.text('QTÉ', 100, yPos + 7);
          doc.text('P.U. (FCFA)', 130, yPos + 7);
          doc.text('TOTAL (FCFA)', 165, yPos + 7);
          yPos += 10;
        }
        
        if (rowCount % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(15, yPos, 180, 8, 'F');
        }
        
        const description = article.description || '_________________';
        const quantity = parseFloat(article.quantity) || 0;
        const unitPrice = parseFloat(article.unitPrice) || 0;
        const total = parseFloat(article.total) || 0;
        
        doc.setTextColor(...black);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        
        const truncatedDesc = description.length > 40 ? description.substring(0, 37) + '...' : description;
        doc.text(truncatedDesc, 20, yPos + 5.5);
        doc.text(quantity.toString(), 100, yPos + 5.5, { align: 'center' });
        doc.text(unitPrice.toLocaleString('fr-FR'), 130, yPos + 5.5, { align: 'right' });
        doc.text(total.toLocaleString('fr-FR'), 165, yPos + 5.5, { align: 'right' });
        
        yPos += 8;
        rowCount++;
      });
      
      // Totaux
      yPos += 8;
      doc.setDrawColor(...mediumGray);
      doc.setLineWidth(0.5);
      doc.line(120, yPos, 195, yPos);
      
      const totalHT = calculateTotal();
      const tvaAmount = formData.applyTva ? totalHT * formData.tva / 100 : 0;
      const totalTTC = calculateTTC();
      
      yPos += 8;
      doc.setFontSize(9);
      doc.setTextColor(...black);
      doc.text('Total HT:', 150, yPos);
      doc.text(`${totalHT.toLocaleString('fr-FR')} FCFA`, 195, yPos, { align: 'right' });
      
      if (formData.applyTva) {
        yPos += 7;
        doc.text(`TVA (${formData.tva}%):`, 150, yPos);
        doc.text(`${tvaAmount.toLocaleString('fr-FR')} FCFA`, 195, yPos, { align: 'right' });
      }
      
      yPos += 8;
      doc.setDrawColor(...black);
      doc.setLineWidth(0.8);
      doc.line(120, yPos, 195, yPos);
      
      yPos += 7;
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...black);
      doc.text(`Total ${formData.applyTva ? 'TTC' : 'HT'}:`, 150, yPos);
      doc.text(`${totalTTC.toLocaleString('fr-FR')} FCFA`, 195, yPos, { align: 'right' });
      
      // Pied de page
      yPos = 275;
      doc.setDrawColor(...mediumGray);
      doc.setLineWidth(0.5);
      doc.line(15, yPos, 195, yPos);
      
      yPos += 5;
      doc.setFontSize(8);
      doc.setTextColor(...mediumGray);
      doc.setFont(undefined, 'normal');
      doc.text('Merci pour votre confiance', 105, yPos, { align: 'center' });
      
      
      
      // Téléchargement
      const pdfBlob = doc.output('blob');
      const fileName = `facture_${Date.now()}.pdf`;
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      Alert.alert('Succès', 'Facture PDF téléchargée avec succès!');
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Impossible de générer la facture');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>×</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Nouvelle Facture</Text>
          <Text style={styles.subtitle}>Remplissez les informations</Text>
        </View>

        {/* Logo */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>🖼</Text>
            </View>
            <Text style={styles.sectionTitle}>Logo de l'entreprise</Text>
          </View>
          <TouchableOpacity style={styles.logoButton} onPress={pickImage}>
            {formData.logo ? (
              <Image source={{ uri: formData.logo.startsWith('data:') ? formData.logo : `data:image/png;base64,${formData.logo}` }} style={styles.logoPreview} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>+</Text>
                <Text style={styles.logoPlaceholderSubtext}>Ajouter votre logo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Entreprise */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>🏢</Text>
            </View>
            <Text style={styles.sectionTitle}>Informations de l'entreprise</Text>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nom de l'entreprise</Text>
            <TextInput style={styles.input} value={formData.companyName} onChangeText={(text) => setFormData({...formData, companyName: text})} />
          </View>
          <View style={styles.twoCol}>
            <View style={[styles.fieldGroup, styles.flex1]}>
              <Text style={styles.fieldLabel}>Téléphone</Text>
              <TextInput style={styles.input} value={formData.phone} onChangeText={(text) => setFormData({...formData, phone: text})} />
            </View>
            <View style={[styles.fieldGroup, styles.flex1]}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput style={styles.input} value={formData.email} onChangeText={(text) => setFormData({...formData, email: text})} />
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Adresse</Text>
            <TextInput style={styles.input} value={formData.address} onChangeText={(text) => setFormData({...formData, address: text})} />
          </View>
        </View>

        {/* Client */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>👤</Text>
            </View>
            <Text style={styles.sectionTitle}>Informations du client</Text>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nom du client</Text>
            <TextInput style={styles.input} value={formData.clientName} onChangeText={(text) => setFormData({...formData, clientName: text})} />
          </View>
          <View style={styles.twoCol}>
            <View style={[styles.fieldGroup, styles.flex1]}>
              <Text style={styles.fieldLabel}>Téléphone</Text>
              <TextInput style={styles.input} value={formData.clientPhone} onChangeText={(text) => setFormData({...formData, clientPhone: text})} />
            </View>
            <View style={[styles.fieldGroup, styles.flex1]}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput style={styles.input} value={formData.clientEmail} onChangeText={(text) => setFormData({...formData, clientEmail: text})} />
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Adresse</Text>
            <TextInput style={styles.input} value={formData.clientAddress} onChangeText={(text) => setFormData({...formData, clientAddress: text})} />
          </View>
        </View>

        {/* Articles */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>📋</Text>
            </View>
            <Text style={styles.sectionTitle}>Articles</Text>
          </View>

          {formData.articles.map((article, index) => (
            <View key={index} style={styles.articleRow}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={article.description}
                  onChangeText={(text) => updateArticle(index, 'description', text)}
                />
              </View>
              <View style={styles.threeCol}>
                <View style={[styles.fieldGroup, styles.flex1]}>
                  <Text style={styles.fieldLabel}>Qté</Text>
                  <TextInput
                    style={styles.input}
                    value={article.quantity}
                    keyboardType="numeric"
                    onChangeText={(text) => updateArticle(index, 'quantity', text)}
                  />
                </View>
                <View style={[styles.fieldGroup, styles.flex1]}>
                  <Text style={styles.fieldLabel}>Prix U.</Text>
                  <TextInput
                    style={styles.input}
                    value={article.unitPrice}
                    keyboardType="numeric"
                    onChangeText={(text) => updateArticle(index, 'unitPrice', text)}
                  />
                </View>
                <View style={[styles.fieldGroup, styles.flex1]}>
                  <Text style={styles.fieldLabel}>Total</Text>
                  <View style={styles.totalCell}>
                    <Text style={styles.totalCellText}>
                      {article.total ? parseFloat(article.total).toLocaleString('fr-FR') : '—'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addArticleButton} onPress={addArticle}>
            <Text style={styles.addArticleText}>+ Ajouter un article</Text>
          </TouchableOpacity>
        </View>

        {/* TVA */}
        <View style={styles.tvaToggleRow}>
          <Text style={styles.tvaToggleLabel}>Appliquer la TVA (18%)</Text>
          <TouchableOpacity
            style={[styles.toggleTrack, formData.applyTva && styles.toggleTrackActive]}
            onPress={() => setFormData({...formData, applyTva: !formData.applyTva})}
          >
            <View style={[styles.toggleThumb, formData.applyTva && styles.toggleThumbActive]} />
          </TouchableOpacity>
        </View>

        {formData.applyTva && (
          <View style={styles.tvaRateRow}>
            <Text style={styles.tvaRateLabel}>Taux TVA :</Text>
            <TextInput
              style={[styles.input, styles.tvaRateInput]}
              value={formData.tva.toString()}
              keyboardType="numeric"
              onChangeText={(text) => setFormData({...formData, tva: parseFloat(text) || 18})}
            />
            <Text style={styles.tvaRateLabel}>%</Text>
          </View>
        )}

        {/* Totaux */}
        <View style={styles.totalsCard}>
          <View style={styles.totalLine}>
            <Text style={styles.totalLineLabel}>Total HT</Text>
            <Text style={styles.totalLineValue}>{calculateTotal().toLocaleString('fr-FR')} FCFA</Text>
          </View>
          {formData.applyTva && (
            <View style={styles.totalLine}>
              <Text style={styles.totalLineLabel}>TVA ({formData.tva}%)</Text>
              <Text style={styles.totalLineValue}>{(calculateTotal() * formData.tva / 100).toLocaleString('fr-FR')} FCFA</Text>
            </View>
          )}
          <View style={[styles.totalLine, styles.grandTotalLine]}>
            <Text style={styles.grandTotalLabel}>Total {formData.applyTva ? 'TTC' : 'HT'}</Text>
            <Text style={styles.grandTotalValue}>{calculateTTC().toLocaleString('fr-FR')} FCFA</Text>
          </View>
        </View>

        {/* Bouton */}
        <TouchableOpacity style={styles.paymentButton} onPress={generatePDF}>
          <Text style={styles.paymentButtonText}>Télécharger PDF gratuitement</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  scrollView: {
    flex: 1,
  },
  homeBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 36,
    alignItems: 'center',
    width: '100%',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  logoCircle: {
    width: 200,
    height: 200,
    backgroundColor: 'transparent',
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  },
  logoImage: {
    width: 180,
    height: 180,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: '#404040',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#404040',
    padding: 20,
    paddingTop: 10,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 10,
    right: 20,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 12,
    marginBottom: 0,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionIconText: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  fieldGroup: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#F7F7F8',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#1C1C1E',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 8,
  },
  threeCol: {
    flexDirection: 'row',
    gap: 6,
  },
  flex1: {
    flex: 1,
  },
  logoButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  logoPreview: {
    width: '100%',
    height: 100,
    resizeMode: 'contain',
    borderRadius: 12,
  },
  logoPlaceholder: {
    backgroundColor: '#F7F7F8',
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  logoPlaceholderText: {
    fontSize: 22,
    color: '#C7C7CC',
  },
  logoPlaceholderSubtext: {
    fontSize: 12,
    color: '#C7C7CC',
    fontWeight: '500',
  },
  articleRow: {
    backgroundColor: '#F7F7F8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  totalCell: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  totalCellText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#404040',
  },
  addArticleButton: {
    backgroundColor: '#F7F7F8',
    borderWidth: 1.5,
    borderColor: '#404040',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  addArticleText: {
    color: '#404040',
    fontSize: 14,
    fontWeight: '600',
  },
  tvaToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    margin: 12,
    marginBottom: 0,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  tvaToggleLabel: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  toggleTrack: {
    width: 44,
    height: 26,
    backgroundColor: '#C7C7CC',
    borderRadius: 13,
    justifyContent: 'center',
    padding: 2,
  },
  toggleTrackActive: {
    backgroundColor: '#404040',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    backgroundColor: '#fff',
    borderRadius: 11,
    alignSelf: 'flex-start',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  tvaRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 8,
  },
  tvaRateLabel: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  tvaRateInput: {
    width: 60,
  },
  totalsCard: {
    backgroundColor: '#404040',
    borderRadius: 16,
    padding: 16,
    margin: 12,
    marginBottom: 0,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  grandTotalLine: {
    borderBottomWidth: 0,
    paddingTop: 10,
    marginTop: 4,
  },
  totalLineLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  totalLineValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  paymentButton: {
    backgroundColor: '#404040',
    borderRadius: 14,
    padding: 16,
    margin: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});