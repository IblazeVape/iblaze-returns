// lib/sidebar-icons.ts
import {
  HelpCircle, Mail, Phone, MessageCircle, FileText, ShoppingBag, Truck, Package,
  CreditCard, Shield, Info, ExternalLink, Star, Heart, Gift, Tag, MapPin, Clock,
  Calendar, Settings, User, Users, Home, Book, BookOpen, Newspaper, Link as LinkIcon,
  Globe, Video, Camera, Image as ImageIcon, Music, Headphones, ThumbsUp, Award,
  Trophy, Bell, Lock, Key, Search, Filter, List, Grid, Layers, Box, Archive,
  Bookmark, Flag, AlertCircle, CheckCircle, XCircle, ArrowRight, Zap, Sparkles,
  RotateCcw, LifeBuoy, type LucideIcon,
} from "lucide-react";

/** A curated set of Lucide icons for the sidebar-link picker — not the full
 * ~1500-icon library. Importing every icon (`import * as Icons`) would defeat
 * tree-shaking and bloat the customer-facing bundle, since the chosen icon
 * has to render in the actual portal sidebar, not just the admin Settings
 * page. This list covers common nav/support use cases (FAQ, contact,
 * shipping, policies, social) instead. */
export const SIDEBAR_ICONS: Record<string, LucideIcon> = {
  HelpCircle, Mail, Phone, MessageCircle, FileText, ShoppingBag, Truck, Package,
  CreditCard, Shield, Info, ExternalLink, Star, Heart, Gift, Tag, MapPin, Clock,
  Calendar, Settings, User, Users, Home, Book, BookOpen, Newspaper, Link: LinkIcon,
  Globe, Video, Camera, Image: ImageIcon, Music, Headphones, ThumbsUp, Award,
  Trophy, Bell, Lock, Key, Search, Filter, List, Grid, Layers, Box, Archive,
  Bookmark, Flag, AlertCircle, CheckCircle, XCircle, ArrowRight, Zap, Sparkles,
  RotateCcw, LifeBuoy,
};

export const SIDEBAR_ICON_NAMES = Object.keys(SIDEBAR_ICONS).sort();

export function getSidebarIcon(name: string | undefined): LucideIcon | null {
  if (!name) return null;
  return SIDEBAR_ICONS[name] ?? null;
}
