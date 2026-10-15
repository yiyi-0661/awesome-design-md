import type { AnalysisResult, MethodArticle, ResearchIssue, UpdateSettings } from "./types";

export const demoIssues: ResearchIssue[] = [
  {
    id: "2026-10-14",
    date: "2026-10-14",
    dateRange: "OCT 08–14, 2026",
    title: "Programmable nucleic acids and selective catalysis",
    synthesis:
      "本期关注核酸结构如何塑造反应微环境，以及计算方法如何帮助解释催化选择性。所选论文覆盖 DNA 手性催化、RNA 结构表征和反应环境建模。",
    generatedAt: "2026-10-14T09:00:00+08:00",
    papers: [
      {
        id: "dna-chiral-catalysis",
        title: "Programmable DNA microenvironments for asymmetric catalysis in water",
        authors: "M. Chen, R. Alvarez, and collaborators",
        venue: "ChemRxiv",
        publishedAt: "2026-10-12",
        topics: ["DNA", "CATALYSIS"],
        summary:
          "作者利用可编程 DNA 二级结构调节金属配位位点附近的疏水性与空间限制，在水相不对称反应中观察到可调的对映选择性。结果强调序列本身并非唯一变量，局部构象与底物定位共同决定催化表现。",
        coreProblem: "如何将 DNA 的可编程结构转化为可预测的手性反应微环境。",
        strategy: "比较不同序列、二级结构与金属配位模块形成的催化体系。",
        innovation: "把结构表征和催化选择性关联到统一的局部微环境模型。",
        evidence: "多组底物、构象探针和对照序列支持结构—选择性关联。",
        uncertainty: "底物范围仍有限，结构变化与速率变化之间的因果关系需要进一步验证。",
        doi: "10.26434/chemrxiv-2026-demo",
        url: "https://chemrxiv.org/"
      },
      {
        id: "rna-ensemble",
        title: "Learning RNA conformational ensembles from sparse chemical probing",
        authors: "A. Patel, J. Liu, et al.",
        venue: "bioRxiv",
        publishedAt: "2026-10-10",
        topics: ["RNA", "AI FOR CHEMISTRY"],
        summary:
          "该研究将稀疏化学探针数据与结构先验结合，学习 RNA 的构象集合而非单一最低能结构。模型给出的不确定性可用于判断哪些区域需要追加实验约束。",
        coreProblem: "有限实验数据下如何描述 RNA 的动态构象分布。",
        strategy: "以物理先验约束概率模型，并用独立探针数据评估泛化。",
        innovation: "把预测目标从单结构扩展为带校准不确定性的构象集合。",
        evidence: "多个 RNA 家族和留出实验条件上的一致性评估。",
        uncertainty: "长 RNA 和配体诱导构象变化的覆盖仍不足。",
        doi: "10.1101/2026.10.10.demo",
        url: "https://www.biorxiv.org/"
      },
      {
        id: "reaction-environment",
        title: "Interpretable representations of catalytic reaction environments",
        authors: "S. Kumar, E. Wright, et al.",
        venue: "Journal of Catalysis",
        publishedAt: "2026-10-09",
        topics: ["ORGANIC SYNTHESIS", "INTERPRETABILITY"],
        summary:
          "论文提出一种保留配位结构和溶剂暴露信息的反应表示，用于区分影响选择性的局部因素。可解释性分析提供候选机制，但并不能替代动力学或光谱证据。",
        coreProblem: "如何让反应预测表示同时保留局部化学意义。",
        strategy: "构建几何感知表示并以消融和反事实扰动检查特征贡献。",
        innovation: "把模型归因限定到可实验验证的局部环境变化。",
        evidence: "跨反应家族测试、消融研究与部分实验趋势吻合。",
        uncertainty: "归因结果仍依赖训练分布，不应直接解释为反应机制。",
        doi: "10.1016/j.jcat.2026.demo",
        url: "https://www.sciencedirect.com/journal/journal-of-catalysis"
      }
    ]
  }
];

export const demoMethods: MethodArticle[] = [
  {
    id: "method-1",
    slug: "dna-as-a-chiral-scaffold",
    title: "DNA as a programmable chiral scaffold",
    excerpt: "A working note on sequence, conformation, metal coordination, and the origin of selectivity.",
    content: `# DNA as a programmable chiral scaffold

DNA catalysis is most useful when the helix is treated as a **tunable reaction environment**, not a passive ligand.

## Working model

1. The metal complex defines the immediate coordination geometry.
2. The DNA fold controls local hydration and substrate access.
3. Sequence and secondary structure reshape the ensemble of productive poses.

## Questions to test

- Does a change in enantioselectivity track a measurable structural transition?
- Which observations distinguish binding from true transition-state stabilization?
- Can the same scaffold transfer across related reaction classes?

The note remains a hypothesis map, not a mechanism claim.`,
    tags: ["DNA", "CATALYSIS", "METHOD"],
    status: "published",
    author: "Li Lab",
    updatedAt: "2026-10-13T10:30:00+08:00",
    version: 3
  },
  {
    id: "method-2",
    slug: "reading-catalysis-papers",
    title: "A compact protocol for reading catalysis papers",
    excerpt: "Separate observation, model, and mechanism before comparing catalytic systems.",
    content: `# A compact protocol for reading catalysis papers

Start with the **measured outcome**, then reconstruct the chain from experimental setup to interpretation.

| Layer | Question |
| --- | --- |
| Observation | What was directly measured? |
| Comparison | Which control makes the effect interpretable? |
| Model | What explanation is consistent with the data? |
| Mechanism | What additional evidence would make the claim causal? |

This separation prevents an attractive mechanistic diagram from outrunning the evidence.`,
    tags: ["CATALYSIS", "READING"],
    status: "published",
    author: "Li Lab",
    updatedAt: "2026-10-10T16:00:00+08:00",
    version: 1
  }
];

export const defaultSettings: UpdateSettings = {
  topics: ["DNA", "RNA", "Catalysis", "Organic Synthesis"],
  cadence: "Every Monday",
  paperCount: 10,
  version: 1,
  updatedAt: "2026-10-14T09:00:00+08:00"
};

export const demoAnalysis: AnalysisResult = {
  id: "analysis-demo",
  fileName: "programmable-dna-catalysis.pdf",
  title: "Programmable DNA microenvironments for asymmetric catalysis in water",
  status: "complete",
  createdAt: "2026-10-14T11:20:00+08:00",
  coreMethod: {
    heading: "将 DNA 构象视为可调节的催化微环境",
    body:
      "论文比较一组共享金属配位模块、但序列与二级结构不同的 DNA 催化体系。核心推断来自结构扰动、底物范围和对照序列之间的一致趋势；这些结果支持局部微环境参与选择性控制，但尚不足以单独确立过渡态机制。",
    evidence: ["Extracted from paper · Methods §2.1–2.4", "AI interpretation · evidence-bounded", "Limitations · substrate scope remains narrow"]
  },
  referenceOrigins: [
    {
      title: "DNA-based asymmetric catalysis: principles and early demonstrations",
      relation: "FOUNDATIONAL METHOD",
      doi: "10.1002/anie.demo-1",
      note: "提供 DNA–金属复合催化的基础设计框架；当前论文继承该框架并把重点转向构象可编程性。"
    },
    {
      title: "Second-sphere control in aqueous asymmetric catalysis",
      relation: "THEORY",
      doi: "10.1021/jacs.demo-2",
      note: "支持第二配位层和局部溶剂环境影响选择性的解释，但并不直接证明本文提出的结构机制。"
    }
  ],
  relatedPapers: [
    {
      title: "Sequence-dependent selectivity in DNA-hybrid catalysts",
      relation: "PREDECESSOR",
      doi: "10.1039/demo-3",
      note: "研究相同问题，但主要以序列筛选建立经验关联。"
    },
    {
      title: "Peptide-defined microenvironments for catalysis in water",
      relation: "ALTERNATIVE METHOD",
      doi: "10.1021/demo-4",
      note: "用可编程肽结构解决相似的水相选择性控制问题。"
    },
    {
      title: "Conformational ensembles in nucleic-acid catalysis",
      relation: "EXTENSION",
      doi: "10.1002/demo-5",
      note: "进一步把静态结构—活性关系扩展为构象集合模型。"
    }
  ]
};
